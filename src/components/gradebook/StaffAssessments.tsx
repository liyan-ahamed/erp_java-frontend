'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus } from '@/components/ui/icons';
import { PageContainer } from '@/components/common/PageContainer';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AssessmentForm } from '@/components/gradebook/AssessmentForm';
import { EmptyBlock, ErrorBanner, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { ConfirmDialog, ProgressBar, RowMenu, StatusChip, TypeChip, shortDate, typeLabel } from '@/components/gradebook/assessment-ui';
import { TeachingSelector } from '@/components/academic/TeachingSelector';
import { useAuth } from '@/contexts/auth-context';
import { useTeachingSelection } from '@/hooks/useTeachingSelection';
import { useAllAssessments, useAssessmentSummaries, useDeleteAssessment, useSectionSizes } from '@/hooks/useGradebook';
import { getApiErrorMessage } from '@/lib/api-error';
import { ACTION_LABEL, Progress, progressOf } from '@/lib/assessment-marks';
import { formatMarks, SELECT_CLASS } from '@/lib/gradebook-labels';
import { batchLabel, classOptions, classesIn } from '@/lib/teaching-context';
import { ROUTES } from '@/constants/routes';
import { Assessment, AssessmentSummary, AssessmentType, SubjectOffering } from '@/types/gradebook';

type TypeFilter = 'ALL' | 'CAT' | AssessmentType;
type StatusFilter = 'ALL' | 'DRAFT' | 'FINALIZED';

/** Chips always offered (the backend's own types); any other type the teacher has used is added after them. */
const BASE_TYPE_CHIPS: TypeFilter[] = ['CAT', 'QUIZ', 'ASSIGNMENT', 'PRACTICAL', 'RECORD'];

const matchesType = (a: Assessment, f: TypeFilter) =>
  f === 'ALL' || (f === 'CAT' ? a.assessmentType === 'CAT_1' || a.assessmentType === 'CAT_2' : a.assessmentType === f);

const byDateAsc = (a: Assessment, b: Assessment) => a.assessmentDate.localeCompare(b.assessmentDate) || a.id - b.id;
const byDateDesc = (a: Assessment, b: Assessment) => -byDateAsc(a, b);

type Panel = { mode: 'create'; offeringId?: number; template?: Assessment } | { mode: 'edit'; assessment: Assessment } | null;

const assessmentHref = (a: Pick<Assessment, 'id'>) => `${ROUTES.ASSESSMENTS}/${a.id}`;

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={`h-[30px] px-3 rounded-full text-[12px] border whitespace-nowrap transition-colors ${
        active ? 'bg-fg text-surface border-fg' : 'bg-surface text-fg border-line hover:bg-soft'
      }`}
    >
      {children}
    </button>
  );
}

/** One draft that still needs work: progress and the next step. */
function AttentionCard({ a, progress }: { a: Assessment; progress: Progress | null }) {
  const router = useRouter();
  const note = !progress
    ? 'Loading…'
    : progress.state === 'not-started'
      ? 'Not started'
      : progress.state === 'ready'
        ? 'Ready to finalize'
        : `Held ${shortDate(a.assessmentDate)} · ${progress.missing} missing`;
  return (
    <div className="rounded-[14px] border border-[color-mix(in_srgb,var(--orange-text)_25%,var(--border))] bg-warn-soft p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-[550] text-fg truncate">{a.title}</div>
          <div className="font-mono text-[10.5px] text-muted truncate mt-0.5">{a.subjectName} · {a.subjectCode} · Sec {a.sectionName}</div>
        </div>
        <span className="text-[11px] text-muted whitespace-nowrap">{typeLabel(a.assessmentType)}</span>
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={progress?.entered ?? 0} total={progress?.total ?? 0} label={`Marks entered for ${a.title}`} />
        <span className="text-[11px] text-muted whitespace-nowrap">{progress ? `${progress.entered} / ${progress.total} marks` : '…'}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-muted">{note}</span>
        <Button size="sm" onClick={() => router.push(assessmentHref(a))}>{progress ? ACTION_LABEL[progress.state] : 'Open'}</Button>
      </div>
    </div>
  );
}

interface ClassGroupProps {
  offering: SubjectOffering;
  studentCount: number | null;
  assessments: Assessment[];
  totalForClass: Assessment[];
  summaries: Map<number, AssessmentSummary>;
  onAdd: () => void;
  onEdit: (a: Assessment) => void;
  onDuplicate: (a: Assessment) => void;
  onDelete: (a: Assessment) => void;
  canChange: (a: Assessment) => boolean;
}

function ClassGroup({ offering, studentCount, assessments, totalForClass, summaries, onAdd, onEdit, onDuplicate, onDelete, canChange }: ClassGroupProps) {
  const router = useRouter();
  const finalized = totalForClass.filter((a) => a.status === 'FINALIZED').length;
  return (
    <section className="panel" aria-label={`${offering.subjectName}, section ${offering.sectionName}`}>
      <div className="panel-header !items-start">
        <div className="min-w-0">
          <h2 className="!text-[15px]">{offering.subjectName}</h2>
          <p className="font-mono !text-[11px] !mt-1">
            {offering.subjectCode} · {batchLabel(offering.batchName)} · Sec {offering.sectionName} · Sem {offering.semester}
            {studentCount !== null && ` · ${studentCount} students`}
            {!offering.active && ' · inactive'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted whitespace-nowrap flex-wrap justify-end">
          <span>{totalForClass.length} assessment{totalForClass.length === 1 ? '' : 's'} · {finalized} finalized</span>
          {offering.active && (
            <button type="button" onClick={onAdd} className="text-accent underline underline-offset-2 hover:opacity-80">+ Add to this class</button>
          )}
        </div>
      </div>
      {assessments.length === 0 ? (
        <p className="px-[21px] pb-5 text-[12.5px] text-muted">
          {totalForClass.length === 0 ? 'No assessments yet.' : 'No assessments match these filters.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="f-table">
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Date</th>
                <th>Marks entered</th>
                <th>Class average</th>
                <th>Pass rate</th>
                <th>Status</th>
                <th className="col-fit"><span className="sr-only">Action</span></th>
                <th className="col-fit"><span className="sr-only">More actions</span></th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const s = summaries.get(a.id);
                const progress = s ? progressOf(a.status, s) : null;
                const final = a.status === 'FINALIZED';
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={assessmentHref(a)} className="font-[550] text-fg hover:underline">{a.title}</Link>
                        <TypeChip type={a.assessmentType} />
                      </div>
                    </td>
                    <td className="text-muted">{shortDate(a.assessmentDate)}</td>
                    <td className={progress && progress.entered === 0 ? 'font-[550]' : ''}>{progress ? `${progress.entered} / ${progress.total}` : '…'}</td>
                    {/* Statistics are shown once marks are final; draft marks are not results yet. */}
                    <td>{final && s?.average !== null && s?.average !== undefined ? `${Number(s.average).toFixed(1)} / ${formatMarks(a.maxMarks)}` : '—'}</td>
                    <td className="text-muted">
                      {!final || !s ? '—' : s.passMarks === null ? 'No pass mark' : s.passPercentage === null ? '—' : `${Math.round(Number(s.passPercentage))}%`}
                    </td>
                    <td><StatusChip assessment={a} /></td>
                    <td className="text-right">
                      {final ? (
                        <Link href={assessmentHref(a)} className="text-accent underline underline-offset-2 text-[12px] whitespace-nowrap">View results</Link>
                      ) : canChange(a) ? (
                        <Button size="sm" onClick={() => router.push(assessmentHref(a))}>{progress ? ACTION_LABEL[progress.state] : 'Open'}</Button>
                      ) : (
                        <Link href={assessmentHref(a)} className="text-accent underline underline-offset-2 text-[12px]">View</Link>
                      )}
                    </td>
                    <td>
                      <RowMenu
                        label={`More actions for ${a.title}`}
                        actions={[
                          { label: 'Edit details', onSelect: () => onEdit(a), disabledReason: final ? 'Finalized assessments are locked' : !canChange(a) ? 'Only the assigned staff member can edit' : undefined },
                          { label: 'Duplicate', onSelect: () => onDuplicate(a), disabledReason: offering.active ? undefined : 'This class is no longer active' },
                          { label: 'Delete', danger: true, onSelect: () => onDelete(a), disabledReason: final ? 'Finalized assessments cannot be deleted' : !canChange(a) ? 'Only the assigned staff member can delete' : undefined },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * STAFF → Assessments overview (contract §I). Opens on the staff member's current batch and semester with all
 * their classes, so there is always something to see without choosing first.
 */
export function StaffAssessments() {
  const router = useRouter();
  const { user } = useAuth();
  const all = useAllAssessments();
  const drafts = useMemo(() => (all.data ?? []).filter((a) => a.status === 'DRAFT'), [all.data]);
  const preferIds = useMemo(() => [...new Set((drafts.length ? drafts : all.data ?? []).map((a) => a.subjectOfferingId))], [drafts, all.data]);
  const { rows, batches, selection, setSelection, isLoading, isError, error } = useTeachingSelection({ prefer: preferIds });

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [panel, setPanel] = useState<Panel>(null);
  const [toDelete, setToDelete] = useState<Assessment | null>(null);
  const remove = useDeleteAssessment();

  // Classes of the chosen batch + semester; inactive ones only when they hold assessments (history).
  const periodClasses = useMemo(() => {
    const withData = new Set((all.data ?? []).map((a) => a.subjectOfferingId));
    return classesIn(rows, selection).filter((o) => o.active || withData.has(o.id));
  }, [rows, selection, all.data]);
  const classList = useMemo(() => classOptions(periodClasses), [periodClasses]);
  const shownClasses = selection.offeringId === null ? periodClasses : periodClasses.filter((o) => o.id === selection.offeringId);

  const inPeriod = useMemo(() => {
    const ids = new Set(periodClasses.map((o) => o.id));
    return (all.data ?? []).filter((a) => ids.has(a.subjectOfferingId));
  }, [all.data, periodClasses]);
  const inClass = useMemo(
    () => inPeriod.filter((a) => selection.offeringId === null || a.subjectOfferingId === selection.offeringId),
    [inPeriod, selection.offeringId],
  );
  const afterType = useMemo(() => inClass.filter((a) => matchesType(a, typeFilter)), [inClass, typeFilter]);
  const visible = useMemo(() => afterType.filter((a) => statusFilter === 'ALL' || a.status === statusFilter), [afterType, statusFilter]);

  const attention = useMemo(() => inPeriod.filter((a) => a.status === 'DRAFT').sort(byDateAsc), [inPeriod]);
  // Drafts outside the chosen period still need doing: point to them instead of hiding them.
  const elsewhere = useMemo(() => {
    const groups = new Map<string, { batchId: number; batchName: string; semester: number; count: number }>();
    const inPeriodIds = new Set(inPeriod.map((a) => a.id));
    for (const a of drafts) {
      if (inPeriodIds.has(a.id)) continue;
      const key = `${a.batchId}-${a.semester}`;
      const g = groups.get(key) ?? { batchId: a.batchId, batchName: a.batchName, semester: a.semester, count: 0 };
      g.count++;
      groups.set(key, g);
    }
    return [...groups.values()];
  }, [drafts, inPeriod]);

  const summaryIds = useMemo(() => [...new Set([...attention, ...visible].map((a) => a.id))], [attention, visible]);
  const summaryQueries = useAssessmentSummaries(summaryIds);
  const summaries = useMemo(() => {
    const map = new Map<number, AssessmentSummary>();
    summaryQueries.forEach((q) => q.data && map.set(q.data.assessmentId, q.data));
    return map;
  }, [summaryQueries]);
  const summaryError = summaryQueries.find((q) => q.isError)?.error;

  const sectionIds = useMemo(() => [...new Set(shownClasses.filter((o) => o.studentCount == null).map((o) => o.sectionId))], [shownClasses]);
  const sizeQueries = useSectionSizes(sectionIds);
  const sizeOf = (o: SubjectOffering) => o.studentCount ?? sizeQueries[sectionIds.indexOf(o.sectionId)]?.data ?? null;

  const typeChips = useMemo(() => {
    const extra = [...new Set(inClass.map((a) => a.assessmentType))].filter(
      (t) => t !== 'CAT_1' && t !== 'CAT_2' && !BASE_TYPE_CHIPS.includes(t),
    );
    return [...BASE_TYPE_CHIPS, ...extra];
  }, [inClass]);

  const canChange = (a: Assessment) => a.status === 'DRAFT' && a.staffId === user?.id;

  const header = (
    <TeachingSelector rows={rows} batches={batches} value={selection} onChange={setSelection} classMode="none"
      idPrefix="assessments" disabled={isLoading} />
  );

  let body;
  if (all.isLoading || isLoading) body = <LoadingBlock label="Loading your assessments..." />;
  else if (all.isError || isError) body = <ErrorBanner error={all.error ?? error} fallback="Unable to load assessments." title="Error Loading Assessments" />;
  else if (rows.length === 0) body = <div className="panel"><EmptyBlock icon={<ClipboardList className="w-10 h-10" />} title="No classes are assigned to you yet." hint="Assessments appear here once the HOD assigns you a course." /></div>;
  else {
    const draftCount = afterType.filter((a) => a.status === 'DRAFT').length;
    const finalCount = afterType.filter((a) => a.status === 'FINALIZED').length;
    body = (
      <div className="space-y-6">
        <section aria-labelledby="attention-heading" className="space-y-3">
          <h2 id="attention-heading" className="text-[13px] font-[550] text-fg">
            Needs your attention <span className="text-muted font-normal">· {attention.length}</span>
          </h2>
          {attention.length === 0 ? (
            <p className="text-[12.5px] text-muted">
              {inPeriod.length === 0 ? 'No assessments in this semester yet.' : 'Nothing pending — every assessment in this semester is finalized.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {attention.map((a) => {
                const s = summaries.get(a.id);
                return <AttentionCard key={a.id} a={a} progress={s ? progressOf(a.status, s) : null} />;
              })}
            </div>
          )}
          {elsewhere.length > 0 && (
            <p className="text-[12px] text-muted flex flex-wrap gap-x-2 gap-y-1 items-center">
              Also pending:
              {elsewhere.map((g) => (
                <button key={`${g.batchId}-${g.semester}`} type="button" className="text-accent underline underline-offset-2"
                  onClick={() => setSelection({ batchId: g.batchId, semester: g.semester, offeringId: null })}>
                  {g.count} draft{g.count === 1 ? '' : 's'} in {batchLabel(g.batchName)} · Semester {g.semester}
                </button>
              ))}
            </p>
          )}
        </section>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="assessments-class" className="text-[12px] text-muted">Class</label>
            <select id="assessments-class" className={`${SELECT_CLASS} max-sm:w-full`} value={selection.offeringId ?? ''}
              onChange={(e) => setSelection({ ...selection, offeringId: Number(e.target.value) || null })}>
              <option value="">All my classes ({classList.length})</option>
              {classList.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Assessment type">
              <Chip active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')}>All types</Chip>
              {typeChips.map((t) => (
                <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>{t === 'CAT' ? 'CAT' : typeLabel(t as AssessmentType)}</Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
            <Chip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} label={`All statuses, ${afterType.length}`}>All</Chip>
            <Chip active={statusFilter === 'DRAFT'} onClick={() => setStatusFilter('DRAFT')}>Draft · {draftCount}</Chip>
            <Chip active={statusFilter === 'FINALIZED'} onClick={() => setStatusFilter('FINALIZED')}>Finalized · {finalCount}</Chip>
          </div>
        </div>

        {summaryError ? <ErrorBanner error={summaryError} fallback="Some assessment statistics could not be loaded." /> : null}
        {remove.isError && <ErrorBanner error={remove.error} fallback="Unable to delete the assessment." />}

        {shownClasses.length === 0 ? (
          <div className="panel"><EmptyBlock icon={<ClipboardList className="w-10 h-10" />} title="You have no classes in this semester." hint="Choose another batch or semester above." /></div>
        ) : (
          <div className="space-y-4">
            {shownClasses.map((o) => (
              <ClassGroup
                key={o.id}
                offering={o}
                studentCount={sizeOf(o)}
                assessments={visible.filter((a) => a.subjectOfferingId === o.id).sort(byDateDesc)}
                totalForClass={inPeriod.filter((a) => a.subjectOfferingId === o.id)}
                summaries={summaries}
                canChange={canChange}
                onAdd={() => setPanel({ mode: 'create', offeringId: o.id })}
                onEdit={(a) => setPanel({ mode: 'edit', assessment: a })}
                onDuplicate={(a) => setPanel({ mode: 'create', template: a, offeringId: a.subjectOfferingId })}
                onDelete={(a) => { remove.reset(); setToDelete(a); }}
              />
            ))}
          </div>
        )}
        <p className="text-[11.5px] text-muted">
          Edit details, duplicate or delete from the ⋯ menu. Finalized assessments are locked; hover the status to see when.
        </p>
      </div>
    );
  }

  return (
    <PageContainer
      contextArea={header}
      actions={
        <>
          {all.isFetching && !all.isLoading && <Spinner size="sm" />}
          <Button onClick={() => setPanel({ mode: 'create', offeringId: selection.offeringId ?? undefined })}>
            <Plus className="w-4 h-4" /> New assessment
          </Button>
        </>
      }
    >
      {body}

      {panel?.mode === 'create' && (
        <SidePanel title={panel.template ? 'Duplicate Assessment' : 'New Assessment'} onClose={() => setPanel(null)}>
          {panel.template && <p className="text-[12px] text-muted mb-3">Copies the details only — marks are never copied.</p>}
          <AssessmentForm template={panel.template} initialOfferingId={panel.offeringId} onSaved={(a) => router.push(assessmentHref(a))} />
        </SidePanel>
      )}
      {panel?.mode === 'edit' && (
        <SidePanel title="Edit Assessment" onClose={() => setPanel(null)}>
          <AssessmentForm key={panel.assessment.id} assessment={panel.assessment} onSaved={() => setPanel(null)} />
        </SidePanel>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete assessment?"
          confirmLabel="Delete"
          danger
          isLoading={remove.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() => remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
        >
          <p>
            Delete the draft <strong>{toDelete.title}</strong> ({toDelete.subjectCode} · Sec {toDelete.sectionName})? Any marks entered for it
            will be lost. This cannot be undone.
          </p>
          {remove.isError && <p className="text-danger">{getApiErrorMessage(remove.error, 'Unable to delete the assessment.')}</p>}
        </ConfirmDialog>
      )}
    </PageContainer>
  );
}
