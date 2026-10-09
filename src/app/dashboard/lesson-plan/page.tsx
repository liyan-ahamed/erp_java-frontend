'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { NotebookPen, Plus } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DetailField, EmptyBlock, ErrorBanner, FieldLabel, FormError, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { ConfirmBox, TEXTAREA_CLASS } from '@/components/portfolio/shared';
import { FilterBar, ReadOnlyNote, StatTile, StatusBadge, offeringOptionLabel } from '@/components/erp/shared';
import { useAuth } from '@/contexts/auth-context';
import { useSections } from '@/hooks/useAcademic';
import { useAllSubjectOfferings, useAllSubjects, useStaffOptions } from '@/hooks/useGradebook';
import { useLessonPlanAction, useLessonPlanProgress, useLessonPlans, useMyLessonPlans } from '@/hooks/useLessonPlans';
import { lessonPlanService } from '@/services/api/lesson-plan.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { SELECT_CLASS, formatDate } from '@/lib/gradebook-labels';
import { LESSON_PLAN_STATUSES, LESSON_PLAN_STATUS_BADGE, todayIso } from '@/lib/erp-labels';
import { LessonPlan, LessonPlanStatus, LessonPlanSummary } from '@/types/lesson-plan';
import { SubjectOffering } from '@/types/gradebook';

// ---------- Shared ----------

/** Backend progress figures shown as returned (null % = nothing planned yet). */
function ProgressTiles({ progress }: { progress: LessonPlanSummary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatTile label="Planned" value={progress.totalPlanned} hint={progress.cancelled ? `${progress.cancelled} cancelled (not counted)` : undefined} />
      <StatTile label="Completed" value={progress.completed} />
      <StatTile label="Remaining" value={progress.remaining} />
      <StatTile label="Completion" value={progress.completionPercentage === null ? '—' : `${Number(progress.completionPercentage)}%`}
        hint={progress.completionPercentage === null ? 'Nothing planned yet' : undefined} />
    </div>
  );
}

function OfferingProgress({ offeringId }: { offeringId: number }) {
  const { data, isLoading, isError, error } = useLessonPlanProgress(offeringId);
  if (isLoading) return <div className="py-4"><Spinner size="sm" /></div>;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load progress." />;
  return <ProgressTiles progress={data} />;
}

function PlanTable({ plans, showClass, onSelect }: { plans: LessonPlan[]; showClass?: boolean; onSelect?: (p: LessonPlan) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Unit</TableHead>
          <TableHead>Topic</TableHead>
          {showClass && <TableHead>Subject / Class</TableHead>}
          {showClass && <TableHead>Faculty</TableHead>}
          <TableHead className="whitespace-nowrap">Planned Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="whitespace-nowrap">Completed Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.map((p) => (
          <TableRow key={p.id} className={onSelect ? 'cursor-pointer' : ''} onClick={onSelect ? () => onSelect(p) : undefined}>
            <TableCell className="text-[#666666]">{p.unitNumber ?? '—'}</TableCell>
            <TableCell>
              {onSelect ? (
                <button className="font-medium text-left hover:underline underline-offset-2" onClick={(e) => { e.stopPropagation(); onSelect(p); }}>{p.topic}</button>
              ) : <span className="font-medium">{p.topic}</span>}
              {p.description && <div className="text-xs text-[#9A9A9A] mt-0.5 line-clamp-2">{p.description}</div>}
            </TableCell>
            {showClass && <TableCell className="whitespace-nowrap text-[#666666]"><span className="font-mono text-xs mr-1">{p.subjectCode}</span>Sec {p.sectionName}</TableCell>}
            {showClass && <TableCell className="whitespace-nowrap text-[#666666]">{p.staffName}</TableCell>}
            <TableCell className="whitespace-nowrap">{formatDate(p.plannedDate)}</TableCell>
            <TableCell><StatusBadge info={LESSON_PLAN_STATUS_BADGE[p.status]} /></TableCell>
            <TableCell className="whitespace-nowrap text-[#666666]">{p.status === 'COMPLETED' ? formatDate(p.completedDate) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------- STUDENT ----------

function StudentLessonPlans() {
  const { data, isLoading, isError, error } = useMyLessonPlans();
  const groups = useMemo(() => {
    const map = new Map<number, LessonPlan[]>();
    data?.forEach((p) => map.set(p.subjectOfferingId, [...(map.get(p.subjectOfferingId) ?? []), p]));
    return [...map.values()];
  }, [data]);

  if (isLoading) return <LoadingBlock label="Loading lesson plans..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load lesson plans." title="Error Loading Lesson Plans" />;
  if (groups.length === 0) return <Card><EmptyBlock icon={<NotebookPen className="w-10 h-10" />} title="No lesson plans published yet." /></Card>;

  return (
    <div className="space-y-6">
      {groups.map((plans) => {
        const first = plans[0];
        return (
          <Card key={first.subjectOfferingId}>
            <div className="px-6 py-4 border-b border-[#F5F5F5] space-y-3">
              <div>
                <h3 className="text-base font-semibold text-[#111111]">{first.subjectName} <span className="font-mono text-xs text-[#9A9A9A] font-normal">{first.subjectCode}</span></h3>
                <p className="text-xs text-[#9A9A9A] mt-0.5">{first.staffName} · Section {first.sectionName}</p>
              </div>
              <OfferingProgress offeringId={first.subjectOfferingId} />
            </div>
            <PlanTable plans={plans} />
          </Card>
        );
      })}
    </div>
  );
}

// ---------- STAFF ----------

function PlanForm({ offeringId, plan, onDone }: { offeringId: number; plan?: LessonPlan; onDone: () => void }) {
  const action = useLessonPlanAction();
  const [form, setForm] = useState({
    unitNumber: plan?.unitNumber ? String(plan.unitNumber) : '',
    topic: plan?.topic ?? '',
    description: plan?.description ?? '',
    plannedDate: plan?.plannedDate ?? '',
    notes: plan?.notes ?? '',
  });
  const [problem, setProblem] = useState('');
  const set = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setProblem(''); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.topic.trim() || !form.plannedDate) return setProblem('Topic and planned date are required.');
    if (form.unitNumber && !(Number.isInteger(Number(form.unitNumber)) && Number(form.unitNumber) > 0)) return setProblem('Unit must be a positive whole number.');
    const payload = {
      unitNumber: form.unitNumber ? Number(form.unitNumber) : null,
      topic: form.topic.trim(),
      description: form.description.trim() || null,
      plannedDate: form.plannedDate,
      notes: form.notes.trim() || null,
    };
    if (plan) action.mutate({ action: 'update', id: plan.id, payload }, { onSuccess: onDone });
    else action.mutate({ action: 'create', payload: { subjectOfferingId: offeringId, ...payload } }, { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="plan-unit">Unit (optional)</FieldLabel>
          <Input id="plan-unit" type="number" min={1} value={form.unitNumber} onChange={(e) => set({ unitNumber: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="plan-date">Planned Date</FieldLabel>
          <Input id="plan-date" type="date" required value={form.plannedDate} onChange={(e) => set({ plannedDate: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="plan-topic">Topic</FieldLabel>
        <Input id="plan-topic" required maxLength={255} value={form.topic} onChange={(e) => set({ topic: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="plan-description">Description (optional)</FieldLabel>
        <textarea id="plan-description" rows={3} maxLength={2000} className={TEXTAREA_CLASS} value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="plan-notes">Notes (optional)</FieldLabel>
        <textarea id="plan-notes" rows={2} maxLength={1000} className={TEXTAREA_CLASS} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      {problem && <p className="text-sm text-red-600" role="alert">{problem}</p>}
      {action.isError && <FormError error={action.error} fallback="Unable to save the lesson plan." />}
      <Button type="submit" isLoading={action.isPending}>{plan ? 'Save Changes' : 'Add Topic'}</Button>
    </form>
  );
}

function PlanDetail({ plan, onEdit, onChanged }: { plan: LessonPlan; onEdit: () => void; onChanged: (p: LessonPlan) => void }) {
  const action = useLessonPlanAction();
  const [mode, setMode] = useState<'complete' | 'cancel' | null>(null);
  const [completedDate, setCompletedDate] = useState(todayIso());
  const [notes, setNotes] = useState(plan.notes ?? '');

  const run = (a: Parameters<typeof action.mutate>[0]) => action.mutate(a, { onSuccess: (p) => { setMode(null); onChanged(p); } });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Topic" value={plan.topic} />
        <DetailField label="Unit" value={plan.unitNumber ?? '—'} />
        <DetailField label="Planned Date" value={formatDate(plan.plannedDate)} />
        <DetailField label="Status" value={<StatusBadge info={LESSON_PLAN_STATUS_BADGE[plan.status]} />} />
        {plan.status === 'COMPLETED' && <DetailField label="Completed Date" value={formatDate(plan.completedDate)} />}
      </div>
      {plan.description && <DetailField label="Description" value={plan.description} />}
      {plan.notes && <DetailField label="Notes" value={plan.notes} />}
      {action.isError && <FormError error={action.error} fallback="Unable to update the lesson plan." />}

      {mode === 'complete' ? (
        <div className="rounded-[10px] border border-[#E8E8E8] bg-[#FAFAFA] p-4 space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="complete-date">Completed Date</FieldLabel>
            <Input id="complete-date" type="date" max={todayIso()} value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="complete-notes">Notes (optional, replaces current notes)</FieldLabel>
            <textarea id="complete-notes" rows={2} maxLength={1000} className={TEXTAREA_CLASS} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {completedDate > todayIso() && <p className="text-sm text-red-600">Completed date cannot be in the future.</p>}
          <div className="flex gap-2">
            <Button size="sm" isLoading={action.isPending} disabled={completedDate > todayIso()}
              onClick={() => run({ action: 'complete', id: plan.id, payload: { completedDate: completedDate || null, notes: notes.trim() || null } })}>
              Mark Completed
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </div>
      ) : mode === 'cancel' ? (
        <ConfirmBox message="Cancel this planned topic? Cancelled topics no longer count towards progress." confirmLabel="Cancel Topic"
          variant="danger" isLoading={action.isPending} onCancel={() => setMode(null)} onConfirm={() => run({ action: 'cancel', id: plan.id })} />
      ) : plan.status === 'PLANNED' ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { action.reset(); setMode('complete'); }}>Mark Completed</Button>
          <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => { action.reset(); setMode('cancel'); }}>Cancel Topic</Button>
        </div>
      ) : (
        <Button size="sm" variant="secondary" isLoading={action.isPending} onClick={() => run({ action: 'reopen', id: plan.id })}>
          Reopen (set back to Planned)
        </Button>
      )}
    </div>
  );
}

type StaffPanel = { mode: 'create' } | { mode: 'detail'; plan: LessonPlan } | { mode: 'edit'; plan: LessonPlan } | null;

function StaffLessonPlans() {
  const offerings = useAllSubjectOfferings();
  const [offeringId, setOfferingId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<StaffPanel>(null);
  const plans = useLessonPlans({ page, size: 50, subjectOfferingId: offeringId ?? undefined, status: (status || undefined) as LessonPlanStatus | undefined }, offeringId !== null);

  if (offerings.isLoading) return <LoadingBlock label="Loading your offerings..." />;
  if (offerings.isError) return <ErrorBanner error={offerings.error} fallback="Unable to load your subject offerings." />;
  const list = offerings.data ?? [];
  if (list.length === 0) return <Card><EmptyBlock icon={<NotebookPen className="w-10 h-10" />} title="You have no subject offerings." /></Card>;
  const offering = list.find((o) => o.id === offeringId);

  return (
    <div className="space-y-4">
      <FilterBar>
        <select aria-label="Subject offering" className={SELECT_CLASS} value={offeringId ?? ''} onChange={(e) => { setOfferingId(e.target.value ? Number(e.target.value) : null); setPage(0); setPanel(null); }}>
          <option value="">Select a subject offering…</option>
          {list.map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}</option>)}
        </select>
        <select aria-label="Filter by status" className={SELECT_CLASS} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} disabled={!offering}>
          <option value="">All Statuses</option>
          {LESSON_PLAN_STATUSES.map((s) => <option key={s} value={s}>{LESSON_PLAN_STATUS_BADGE[s].label}</option>)}
        </select>
        {offering?.active && <Button size="sm" onClick={() => setPanel({ mode: 'create' })}><Plus className="w-4 h-4 mr-1.5" /> Add Topic</Button>}
        {plans.isFetching && <Spinner size="sm" />}
      </FilterBar>
      {!offering ? (
        <Card><EmptyBlock icon={<NotebookPen className="w-10 h-10" />} title="Choose a subject offering to manage its lesson plan." /></Card>
      ) : (
        <>
          <OfferingProgress offeringId={offering.id} />
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full">
              {plans.isLoading ? <LoadingBlock label="Loading lesson plans..." />
                : plans.isError || !plans.data ? <ErrorBanner error={plans.error} fallback="Unable to load lesson plans." />
                : plans.data.content.length === 0 ? <Card><EmptyBlock icon={<NotebookPen className="w-10 h-10" />} title="No topics planned yet." /></Card>
                : (
                  <Card>
                    <PlanTable plans={plans.data.content} onSelect={(p) => setPanel({ mode: 'detail', plan: p })} />
                    <Pagination data={plans.data} onPageChange={setPage} />
                  </Card>
                )}
            </div>
            {panel && (
              <SidePanel title={panel.mode === 'create' ? 'Add Topic' : panel.mode === 'edit' ? 'Edit Topic' : 'Lesson Plan Topic'} onClose={() => setPanel(null)}>
                {panel.mode === 'create' && <PlanForm offeringId={offering.id} onDone={() => setPanel(null)} />}
                {panel.mode === 'edit' && <PlanForm key={panel.plan.id} offeringId={offering.id} plan={panel.plan} onDone={() => setPanel(null)} />}
                {panel.mode === 'detail' && (
                  <PlanDetail key={`${panel.plan.id}-${panel.plan.status}`} plan={panel.plan}
                    onEdit={() => setPanel({ mode: 'edit', plan: panel.plan })}
                    onChanged={(p) => setPanel({ mode: 'detail', plan: p })} />
                )}
              </SidePanel>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- HOD ----------

/** Backend progress of every listed offering (one request each, read-only). */
function ProgressByOffering({ offerings }: { offerings: SubjectOffering[] }) {
  const results = useQueries({
    queries: offerings.map((o) => ({
      queryKey: [QUERY_KEYS.LESSON_PLAN_SUMMARY, o.id],
      queryFn: () => lessonPlanService.getProgress(o.id),
      refetchInterval: false as const,
    })),
  });
  if (offerings.length === 0) return <Card><EmptyBlock icon={<NotebookPen className="w-10 h-10" />} title="No subject offerings match these filters." /></Card>;
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject Offering</TableHead>
            <TableHead>Faculty</TableHead>
            <TableHead>Planned</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Completion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offerings.map((o, i) => {
            const r = results[i];
            return (
              <TableRow key={o.id}>
                <TableCell className="whitespace-nowrap">{offeringOptionLabel(o)}</TableCell>
                <TableCell className="whitespace-nowrap text-[#666666]">{o.staffName}</TableCell>
                {r.isLoading ? <TableCell colSpan={4}><Spinner size="sm" /></TableCell>
                  : r.isError || !r.data ? <TableCell colSpan={4} className="text-xs text-red-600">Unable to load progress</TableCell>
                  : (
                    <>
                      <TableCell>{r.data.totalPlanned}</TableCell>
                      <TableCell>{r.data.completed}</TableCell>
                      <TableCell>{r.data.remaining}</TableCell>
                      <TableCell>{r.data.completionPercentage === null ? <span className="text-xs text-[#9A9A9A] italic">Nothing planned</span> : `${Number(r.data.completionPercentage)}%`}</TableCell>
                    </>
                  )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function HodLessonPlans() {
  const subjects = useAllSubjects();
  const offerings = useAllSubjectOfferings();
  const sections = useSections(null);
  const staff = useStaffOptions();
  const [filters, setFilters] = useState({ subjectId: '', offeringId: '', sectionId: '', staffId: '', status: '' });
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<'progress' | 'topics'>('progress');
  const set = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); setPage(0); };

  const plans = useLessonPlans({
    page, size: 50,
    subjectId: filters.subjectId ? Number(filters.subjectId) : undefined,
    subjectOfferingId: filters.offeringId ? Number(filters.offeringId) : undefined,
    sectionId: filters.sectionId ? Number(filters.sectionId) : undefined,
    staffId: filters.staffId ? Number(filters.staffId) : undefined,
    status: (filters.status || undefined) as LessonPlanStatus | undefined,
  }, tab === 'topics');

  // The same filters narrow the offering list used for the progress table.
  const filteredOfferings = (offerings.data ?? []).filter((o) =>
    (!filters.subjectId || o.subjectId === Number(filters.subjectId)) &&
    (!filters.offeringId || o.id === Number(filters.offeringId)) &&
    (!filters.sectionId || o.sectionId === Number(filters.sectionId)) &&
    (!filters.staffId || o.staffId === Number(filters.staffId)));

  return (
    <div className="space-y-4">
      <ReadOnlyNote>Department overview. Lesson plans are managed by the assigned staff member.</ReadOnlyNote>
      <FilterBar>
        <select aria-label="Filter by subject" className={SELECT_CLASS} value={filters.subjectId} onChange={(e) => set({ subjectId: e.target.value })}>
          <option value="">All Subjects</option>
          {(subjects.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
        </select>
        <select aria-label="Filter by subject offering" className={SELECT_CLASS} value={filters.offeringId} onChange={(e) => set({ offeringId: e.target.value })}>
          <option value="">All Offerings</option>
          {(offerings.data ?? []).map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}</option>)}
        </select>
        <select aria-label="Filter by section" className={SELECT_CLASS} value={filters.sectionId} onChange={(e) => set({ sectionId: e.target.value })}>
          <option value="">All Sections</option>
          {(sections.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.batchName} — Sec {s.name}</option>)}
        </select>
        <select aria-label="Filter by staff" className={SELECT_CLASS} value={filters.staffId} onChange={(e) => set({ staffId: e.target.value })}>
          <option value="">All Staff</option>
          {(staff.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {tab === 'topics' && (
          <select aria-label="Filter by status" className={SELECT_CLASS} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All Statuses</option>
            {LESSON_PLAN_STATUSES.map((s) => <option key={s} value={s}>{LESSON_PLAN_STATUS_BADGE[s].label}</option>)}
          </select>
        )}
      </FilterBar>
      <div className="inline-flex rounded-[10px] border border-[#E8E8E8] overflow-hidden" role="tablist" aria-label="Lesson plan views">
        {(['progress', 'topics'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`px-4 h-9 text-sm font-medium ${tab === t ? 'bg-[#111111] text-white' : 'bg-white text-[#666666] hover:bg-[#F5F5F5]'}`}>
            {t === 'progress' ? 'Progress by Offering' : 'All Topics'}
          </button>
        ))}
      </div>
      {tab === 'progress' ? (
        offerings.isLoading ? <LoadingBlock label="Loading offerings..." />
          : offerings.isError ? <ErrorBanner error={offerings.error} fallback="Unable to load subject offerings." />
          : <ProgressByOffering offerings={filteredOfferings} />
      ) : plans.isLoading ? <LoadingBlock label="Loading lesson plans..." />
        : plans.isError || !plans.data ? <ErrorBanner error={plans.error} fallback="Unable to load lesson plans." />
        : plans.data.content.length === 0 ? <Card><EmptyBlock icon={<NotebookPen className="w-10 h-10" />} title="No lesson plans published yet." /></Card>
        : (
          <Card>
            <PlanTable plans={plans.data.content} showClass />
            <Pagination data={plans.data} onPageChange={setPage} />
          </Card>
        )}
    </div>
  );
}

function LessonPlanView() {
  const { hasRole } = useAuth();
  return (
    <PageContainer rawLayout>
      {hasRole('ROLE_HOD') ? <HodLessonPlans /> : hasRole('ROLE_STAFF') ? <StaffLessonPlans /> : <StudentLessonPlans />}
    </PageContainer>
  );
}

export default function LessonPlanPage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT']}>
      <LessonPlanView />
    </RequireRole>
  );
}
