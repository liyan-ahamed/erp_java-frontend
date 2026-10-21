'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { AlertTriangle, Layers, Plus, Trash2, X } from '@/components/ui/icons';
import { EmptyBlock, ErrorBanner, FormError, LoadingBlock } from '@/components/gradebook/shared';
import { ConfirmBox } from '@/components/portfolio/shared';
import { SuccessNote } from '@/components/erp/shared';
import { AcademicContextFilter } from '@/components/academic/AcademicContextFilter';
import { ContextPrompt, missingContext } from '@/components/academic/ContextGate';
import { useBatches } from '@/hooks/useAcademic';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import { useCurriculum, useDeleteCurriculum, useSaveCurriculum } from '@/hooks/useCurriculum';
import { AcademicContext, EMPTY_CONTEXT, cohortLabel } from '@/lib/academic-context';
import { formatDateTime, SELECT_CLASS, subjectTypeLabel } from '@/lib/gradebook-labels';
import {
  CURRICULUM_LIMITS,
  CurriculumDraft,
  DraftGroup,
  curriculumProblems,
  draftFrom,
  repeatedSubjects,
  sameDraft,
  toRequest,
} from '@/lib/curriculum';
import { Curriculum } from '@/types/curriculum';
import { SubjectType } from '@/types/gradebook';

// HOD → Courses → Curriculum: which subjects of a cohort + semester are compulsory and which elective groups
// (choose N of these) exist. Saved as one document (contract B); nothing is sent until Save. These rules drive
// the backend's registration status on the Enrollments tab.

interface SubjectOption { subjectId: number; code: string; name: string; subjectType: SubjectType | null; offered: boolean }

let tempKey = 0;
const newGroup = (index: number): DraftGroup => ({ key: `new${++tempKey}`, id: null, name: `Elective Group ${index + 1}`, requiredSelections: 1, subjectIds: [] });

function SubjectLine({ subject, onRemove, repeated }: { subject?: SubjectOption; onRemove: () => void; repeated: boolean }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-[550] text-fg">{subject?.name ?? 'Unknown subject'}</span>
        <span className="block text-[11.5px] text-muted">
          <span className="font-mono">{subject?.code ?? '—'}</span>
          {subject && ` · ${subjectTypeLabel(subject.subjectType)}`}
          {subject && !subject.offered && <span className="text-warn"> · no active offering for this cohort + semester</span>}
          {repeated && <span className="text-danger"> · listed more than once</span>}
        </span>
      </span>
      <button type="button" className="f-btn icon" aria-label={`Remove ${subject?.name ?? 'subject'}`} onClick={onRemove}><X className="w-4 h-4" /></button>
    </li>
  );
}

/** Adds one subject from those not used anywhere in the curriculum yet. */
function AddSubject({ id, label, options, onAdd, disabled }: { id: string; label: string; options: SubjectOption[]; onAdd: (subjectId: number) => void; disabled?: boolean }) {
  return (
    <select id={id} aria-label={label} className={`${SELECT_CLASS} w-full sm:w-auto`} value="" disabled={disabled || options.length === 0}
      onChange={(e) => e.target.value && onAdd(Number(e.target.value))}>
      <option value="">{options.length ? `${label}…` : 'No unassigned subjects left'}</option>
      {options.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.code} — {s.name}</option>)}
    </select>
  );
}

function CurriculumEditor({ curriculum, subjects, onDirtyChange, onReload }: {
  curriculum: Curriculum; subjects: SubjectOption[]; onDirtyChange: (dirty: boolean) => void; onReload: () => Promise<Curriculum | undefined>;
}) {
  const saved = useMemo(() => draftFrom(curriculum), [curriculum]);
  const [draft, setDraft] = useState<CurriculumDraft>(saved);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState('');
  const save = useSaveCurriculum();
  const remove = useDeleteCurriculum();
  const dirty = !sameDraft(draft, saved);

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  // Warn before a reload / tab close loses unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const byId = new Map(subjects.map((s) => [s.subjectId, s]));
  const name = (id: number) => byId.get(id)?.name ?? `Subject #${id}`;
  const used = new Set([...draft.compulsorySubjectIds, ...draft.groups.flatMap((g) => g.subjectIds)]);
  const unassigned = subjects.filter((s) => s.offered && !used.has(s.subjectId));
  const repeated = repeatedSubjects(draft);
  const problems = curriculumProblems(draft, name);
  const conflict = axios.isAxiosError(save.error) && save.error.response?.status === 409;

  const setGroup = (key: string, change: Partial<DraftGroup>) =>
    setDraft({ ...draft, groups: draft.groups.map((g) => (g.key === key ? { ...g, ...change } : g)) });
  const edit = (next: CurriculumDraft) => { setNotice(''); save.reset(); setDraft(next); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        {curriculum.configured ? (
          <>
            <Badge variant="success">Configured</Badge>
            <span>Last saved {curriculum.updatedAt ? formatDateTime(curriculum.updatedAt) : '—'}{curriculum.updatedBy && ` by ${curriculum.updatedBy}`}</span>
          </>
        ) : (
          <>
            <Badge>Not configured</Badge>
            <span>Until a curriculum is saved, every student with registrations shows &quot;Requirements Unknown&quot;.</span>
          </>
        )}
        {dirty && <Badge variant="warning">Unsaved changes</Badge>}
      </div>

      <Card>
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-[600] text-fg mr-auto">Compulsory courses <span className="text-muted font-normal">({draft.compulsorySubjectIds.length})</span></h3>
            <AddSubject id="curriculum-add-compulsory" label="Add compulsory subject" options={unassigned}
              disabled={draft.compulsorySubjectIds.length >= CURRICULUM_LIMITS.compulsory}
              onAdd={(id) => edit({ ...draft, compulsorySubjectIds: [...draft.compulsorySubjectIds, id] })} />
          </div>
          {draft.compulsorySubjectIds.length === 0 ? (
            <p className="text-[13px] text-muted">No compulsory courses. Every student must register for each subject added here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {draft.compulsorySubjectIds.map((id) => (
                <SubjectLine key={id} subject={byId.get(id)} repeated={repeated.has(id)}
                  onRemove={() => edit({ ...draft, compulsorySubjectIds: draft.compulsorySubjectIds.filter((x) => x !== id) })} />
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-[600] text-fg mr-auto">Elective groups <span className="text-muted font-normal">({draft.groups.length})</span></h3>
            <Button size="sm" variant="secondary" disabled={draft.groups.length >= CURRICULUM_LIMITS.groups}
              onClick={() => edit({ ...draft, groups: [...draft.groups, newGroup(draft.groups.length)] })}>
              <Plus className="w-4 h-4" /> Add Elective Group
            </Button>
          </div>
          {draft.groups.length === 0 && <p className="text-[13px] text-muted">No elective groups. Each group asks students to choose a set number of its options.</p>}
          {draft.groups.map((g, i) => (
            <fieldset key={g.key} className="rounded-[12px] border border-line p-3 sm:p-4 space-y-3">
              <legend className="sr-only">{g.name || `Elective group ${i + 1}`}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <label htmlFor={`${g.key}-name`} className="f-label">Group name</label>
                  <Input id={`${g.key}-name`} value={g.name} maxLength={CURRICULUM_LIMITS.groupName} onChange={(e) => { setNotice(''); setGroup(g.key, { name: e.target.value }); }} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`${g.key}-required`} className="f-label">Required selections</label>
                  <Input id={`${g.key}-required`} type="number" min={1} max={Math.max(1, g.subjectIds.length)} step={1} value={g.requiredSelections || ''}
                    onChange={(e) => { setNotice(''); setGroup(g.key, { requiredSelections: e.target.value === '' ? 0 : Number(e.target.value) }); }} />
                </div>
                <Button size="sm" variant="danger" onClick={() => edit({ ...draft, groups: draft.groups.filter((x) => x.key !== g.key) })}>
                  <Trash2 className="w-4 h-4" /> Delete Group
                </Button>
              </div>
              <p className="text-[12px] text-muted">Students choose {g.requiredSelections || '?'} of {g.subjectIds.length} {g.subjectIds.length === 1 ? 'option' : 'options'}.</p>
              {g.subjectIds.length > 0 && (
                <ul className="divide-y divide-line">
                  {g.subjectIds.map((id) => (
                    <SubjectLine key={id} subject={byId.get(id)} repeated={repeated.has(id)}
                      onRemove={() => edit({ ...draft, groups: draft.groups.map((x) => (x.key === g.key ? { ...x, subjectIds: x.subjectIds.filter((s) => s !== id) } : x)) })} />
                  ))}
                </ul>
              )}
              <AddSubject id={`${g.key}-add`} label="Add option" options={unassigned} disabled={g.subjectIds.length >= CURRICULUM_LIMITS.options}
                onAdd={(id) => edit({ ...draft, groups: draft.groups.map((x) => (x.key === g.key ? { ...x, subjectIds: [...x.subjectIds, id] } : x)) })} />
            </fieldset>
          ))}
        </div>
      </Card>

      <Card>
        <div className="p-4 sm:p-5 space-y-2">
          <h3 className="text-[14px] font-[600] text-fg">Not in the curriculum <span className="text-muted font-normal">({unassigned.length})</span></h3>
          <p className="text-[12px] text-muted">Offered to this cohort and semester but neither compulsory nor an elective option. Registrations in these count as optional extras and never affect completeness.</p>
          {unassigned.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {unassigned.map((s) => <li key={s.subjectId}><Badge variant="outline">{s.code} · {s.name}</Badge></li>)}
            </ul>
          )}
        </div>
      </Card>

      {dirty && problems.length > 0 && (
        <div className="flex gap-3 rounded-[12px] bg-warn-soft text-warn px-4 py-3 text-[12.5px]" role="status">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <ul className="space-y-0.5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      {save.isError && (
        <div className="space-y-2">
          <FormError error={save.error} fallback="Unable to save the curriculum." />
          {conflict && (
            <Button size="sm" variant="secondary" onClick={async () => { const fresh = await onReload(); if (fresh) { save.reset(); setDraft(draftFrom(fresh)); } }}>
              Reload the saved curriculum (discards your changes)
            </Button>
          )}
        </div>
      )}
      {remove.isError && <FormError error={remove.error} fallback="Unable to delete the curriculum." />}
      {notice && <SuccessNote>{notice}</SuccessNote>}

      {confirmDelete ? (
        <ConfirmBox
          message={<>Delete this curriculum? Registration status for {curriculum.batchName}, Semester {curriculum.semester} returns to &quot;Requirements Unknown&quot;.</>}
          confirmLabel="Delete Curriculum" variant="danger" isLoading={remove.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => remove.mutate({ batchId: curriculum.batchId, semester: curriculum.semester }, {
            onSuccess: (result) => { setDraft(draftFrom(result)); setNotice('Curriculum deleted.'); },
            onSettled: () => setConfirmDelete(false),
          })}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button disabled={!dirty || problems.length > 0} isLoading={save.isPending}
            onClick={() => save.mutate(
              { batchId: curriculum.batchId, semester: curriculum.semester, payload: toRequest(draft, curriculum.version) },
              { onSuccess: (result) => { setDraft(draftFrom(result)); setNotice('Curriculum saved.'); } },
            )}>
            Save Curriculum
          </Button>
          {dirty && <Button variant="secondary" onClick={() => edit(saved)}>Discard Changes</Button>}
          {curriculum.configured && !dirty && (
            <Button variant="danger" className="sm:ml-auto" onClick={() => { remove.reset(); setConfirmDelete(true); }}>Delete Curriculum</Button>
          )}
        </div>
      )}
    </div>
  );
}

export function CurriculumConfig({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const offerings = useAllSubjectOfferings();
  const batches = useBatches();
  const [ctx, setCtx] = useState<AcademicContext>(EMPTY_CONTEXT);
  const [pendingCtx, setPendingCtx] = useState<AcademicContext | null>(null);
  const [dirty, setDirty] = useState(false);
  const active = useMemo(() => (offerings.data ?? []).filter((o) => o.active), [offerings.data]);
  const prompt = missingContext(ctx, 'semester');
  const curriculum = useCurriculum(prompt ? null : ctx.batchId, prompt ? null : ctx.semester);

  const markDirty = useCallback((value: boolean) => { setDirty(value); onDirtyChange(value); }, [onDirtyChange]);

  // Subjects that can be used: those with an active offering for this cohort + semester (any section),
  // plus any already saved in the curriculum (flagged when their offering is no longer active).
  const subjects = useMemo<SubjectOption[]>(() => {
    if (prompt) return [];
    const map = new Map<number, SubjectOption>();
    active.filter((o) => o.batchId === ctx.batchId && o.semester === ctx.semester)
      .forEach((o) => map.set(o.subjectId, { subjectId: o.subjectId, code: o.subjectCode, name: o.subjectName, subjectType: o.subjectType, offered: true }));
    const c = curriculum.data;
    [...(c?.compulsorySubjects ?? []), ...(c?.electiveGroups.flatMap((g) => g.options) ?? [])].forEach((s) => {
      if (!map.has(s.subjectId)) map.set(s.subjectId, { subjectId: s.subjectId, code: s.code, name: s.name, subjectType: s.subjectType, offered: false });
    });
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [active, ctx, prompt, curriculum.data]);

  const change = (next: AcademicContext) => { setCtx(next); setPendingCtx(null); markDirty(false); };
  const batch = batches.data?.find((b) => b.id === ctx.batchId);

  return (
    <div className="space-y-4">
      <AcademicContextFilter rows={active} value={ctx} cohorts={batches.data} idPrefix="curriculum" levels={['cohort', 'semester']}
        disabled={offerings.isLoading} onChange={(next) => (dirty ? setPendingCtx(next) : change(next))}>
        {curriculum.isFetching && !curriculum.isLoading && <Spinner size="sm" />}
      </AcademicContextFilter>
      {pendingCtx && (
        <ConfirmBox message="You have unsaved changes to this curriculum. Discard them and switch?" confirmLabel="Discard and Switch" variant="danger"
          onCancel={() => setPendingCtx(null)} onConfirm={() => change(pendingCtx)} />
      )}
      {offerings.isError ? (
        <ErrorBanner error={offerings.error} fallback="Unable to load courses." />
      ) : prompt ? (
        <ContextPrompt icon={<Layers className="w-10 h-10" />} title={prompt} hint={ctx.batchId === null ? 'Then choose the semester whose compulsory courses and electives you want to set.' : undefined} />
      ) : curriculum.isLoading ? (
        <LoadingBlock label="Loading curriculum..." />
      ) : curriculum.isError || !curriculum.data ? (
        <ErrorBanner error={curriculum.error} fallback="Unable to load the curriculum." title="Error Loading Curriculum" />
      ) : subjects.length === 0 ? (
        <Card><EmptyBlock icon={<Layers className="w-10 h-10" />} title="No active courses are offered to this cohort in this semester." hint="Assign courses in Class Courses first." /></Card>
      ) : (
        <>
          <p className="text-[12px] text-muted">{batch ? cohortLabel(batch) : curriculum.data.batchName} · Semester {ctx.semester} · applies to every section of the cohort.</p>
          <CurriculumEditor
            key={`${ctx.batchId}-${ctx.semester}`}
            curriculum={curriculum.data}
            subjects={subjects}
            onDirtyChange={markDirty}
            onReload={async () => (await curriculum.refetch()).data}
          />
        </>
      )}
    </div>
  );
}
