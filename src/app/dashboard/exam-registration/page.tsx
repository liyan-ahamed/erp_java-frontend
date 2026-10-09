'use client';

import { FormEvent, useMemo, useState } from 'react';
import { CalendarCheck, FileCheck2, Plus } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DetailField, EmptyBlock, ErrorBanner, FieldLabel, FormError, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { ConfirmBox, TEXTAREA_CLASS } from '@/components/portfolio/shared';
import { FilterBar, ReadOnlyNote, StatusBadge, SuccessNote } from '@/components/erp/shared';
import { useAuth } from '@/contexts/auth-context';
import { useSections } from '@/hooks/useAcademic';
import {
  useAllExamPeriods,
  useEligibleSubjects,
  useExamPeriodAction,
  useExamPeriods,
  useExamRegistrations,
  useMyExamRegistrations,
  useMyOpenExamPeriods,
  useMyRegistrationAction,
  useReviewRegistration,
} from '@/hooks/useExams';
import { SUBJECT_TYPE_LABELS, SELECT_CLASS, formatDate, formatDateTime } from '@/lib/gradebook-labels';
import {
  ACADEMIC_YEAR_PATTERN,
  EXAM_PERIOD_STATUS_BADGE,
  EXAM_REGISTRATION_STATUSES,
  EXAM_REGISTRATION_STATUS_BADGE,
  EXAM_TYPES,
  EXAM_TYPE_LABELS,
  MIN_REJECTION_NOTE,
} from '@/lib/erp-labels';
import { ExamPeriod, ExamRegistration, ExamRegistrationStatus, ExamType, StudentExamPeriod } from '@/types/exam';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

function PeriodHeading({ period }: { period: ExamPeriod }) {
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-base font-semibold text-[#111111]">{period.name}</h3>
        <Badge variant="outline">{EXAM_TYPE_LABELS[period.examType]}</Badge>
        <StatusBadge info={EXAM_PERIOD_STATUS_BADGE[period.status]} />
      </div>
      <p className="text-xs text-[#9A9A9A] mt-0.5">
        {period.academicYear} · Semester {period.semester} · Registration {formatDate(period.registrationStart)} – {formatDate(period.registrationEnd)}
        {period.status === 'OPEN' && !period.registrationWindowOpen && ' · outside the registration window'}
      </p>
    </div>
  );
}

function RegistrationSummary({ registration }: { registration: ExamRegistration }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-[#666666]">Status:</span> <StatusBadge info={EXAM_REGISTRATION_STATUS_BADGE[registration.status]} />
        {registration.submittedAt && <span className="text-xs text-[#9A9A9A]">Submitted {formatDateTime(registration.submittedAt)}</span>}
      </div>
      {registration.reviewedAt && (
        <p className="text-xs text-[#666666]">Reviewed {formatDateTime(registration.reviewedAt)}{registration.reviewedByName ? ` by ${registration.reviewedByName}` : ''}</p>
      )}
      {registration.reviewNote && (
        <div className={`rounded-[10px] p-3 text-sm border ${registration.status === 'REJECTED' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-[#FAFAFA] border-[#E8E8E8] text-[#111111]'}`}>
          <span className="font-medium">{registration.status === 'REJECTED' ? 'Rejection reason: ' : 'Review note: '}</span>{registration.reviewNote}
        </div>
      )}
      <ul className="text-sm text-[#111111] list-disc pl-5">
        {registration.subjects.map((s) => <li key={s.subjectOfferingId}><span className="font-mono text-xs text-[#9A9A9A] mr-1">{s.subjectCode}</span>{s.subjectName}</li>)}
      </ul>
    </div>
  );
}

// ---------- STUDENT ----------

function StudentPeriod({ item, registration }: { item: StudentExamPeriod; registration?: ExamRegistration }) {
  const period = item.period;
  const eligible = useEligibleSubjects(period.id);
  const action = useMyRegistrationAction();
  const [selection, setSelection] = useState<Set<number> | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [message, setMessage] = useState('');

  const status: ExamRegistrationStatus | null = registration?.status ?? item.registrationStatus;
  const editable = period.registrationWindowOpen && (status === null || status === 'DRAFT' || status === 'REJECTED');
  const savedIds = useMemo(() => new Set((eligible.data ?? []).filter((s) => s.selected).map((s) => s.subjectOfferingId)), [eligible.data]);
  const current = selection ?? savedIds;
  const dirty = selection !== null && (selection.size !== savedIds.size || [...selection].some((id) => !savedIds.has(id)));

  const toggle = (id: number) => {
    setMessage('');
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelection(next);
  };

  const save = () => action.mutate({ action: 'save', periodId: period.id, subjectOfferingIds: [...current] }, {
    onSuccess: () => { setSelection(null); setMessage('Draft saved. Submit it before the registration window closes.'); },
  });
  const submit = () => action.mutate({ action: 'submit', periodId: period.id }, {
    onSuccess: () => { setConfirmSubmit(false); setMessage('Registration submitted. The HOD will review it.'); },
    onError: () => setConfirmSubmit(false),
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <PeriodHeading period={period} />
        {status && registration && <RegistrationSummary registration={registration} />}
        {!period.registrationWindowOpen && <ReadOnlyNote>The registration window is not open today, so this registration cannot be changed.</ReadOnlyNote>}
        {status === 'SUBMITTED' && <ReadOnlyNote>Submitted — waiting for HOD review. It can no longer be changed.</ReadOnlyNote>}
        {status === 'APPROVED' && <ReadOnlyNote>Approved. This registration is final.</ReadOnlyNote>}
        {status === 'REJECTED' && editable && <p className="text-sm text-[#92400E]">Update your subjects, save, and submit again.</p>}

        {editable && (
          <div className="space-y-3">
            <FieldLabel>Eligible subjects (from your enrollments)</FieldLabel>
            {eligible.isLoading ? <Spinner size="sm" /> : eligible.isError ? (
              <FormError error={eligible.error} fallback="Unable to load your eligible subjects." />
            ) : (eligible.data ?? []).length === 0 ? (
              <p className="text-sm text-[#9A9A9A]">No eligible subjects for this exam period.</p>
            ) : (
              <ul className="space-y-2">
                {(eligible.data ?? []).map((s) => (
                  <li key={s.subjectOfferingId}>
                    <label className="flex items-start gap-3 rounded-[10px] border border-[#E8E8E8] p-3 cursor-pointer hover:bg-[#FAFAFA]">
                      <input type="checkbox" className="mt-1" checked={current.has(s.subjectOfferingId)} onChange={() => toggle(s.subjectOfferingId)} />
                      <span>
                        <span className="text-sm font-medium text-[#111111]">{s.subjectName}</span>{' '}
                        <span className="font-mono text-xs text-[#9A9A9A]">{s.subjectCode}</span>
                        <span className="block text-xs text-[#666666]">{SUBJECT_TYPE_LABELS[s.subjectType]} · {s.staffName}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {message && <SuccessNote>{message}</SuccessNote>}
            {action.isError && <FormError error={action.error} fallback="Unable to update your registration." />}
            {confirmSubmit ? (
              <ConfirmBox message={`Submit your registration for ${savedIds.size} subject(s)? After submitting you cannot change it unless it is rejected.`}
                confirmLabel="Submit Registration" isLoading={action.isPending} onCancel={() => setConfirmSubmit(false)} onConfirm={submit} />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {dirty && <Badge variant="warning">Unsaved changes</Badge>}
                <Button size="sm" variant="secondary" onClick={save} isLoading={action.isPending} disabled={current.size === 0 || (!dirty && status === 'DRAFT')}>
                  Save Draft
                </Button>
                <Button size="sm" onClick={() => { action.reset(); setConfirmSubmit(true); }}
                  disabled={dirty || status !== 'DRAFT' || savedIds.size === 0}
                  title={dirty ? 'Save your selection first' : status !== 'DRAFT' ? 'Save a draft first' : undefined}>
                  Submit
                </Button>
                {current.size === 0 && <span className="text-xs text-[#9A9A9A]">Select at least one subject.</span>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudentExamRegistration() {
  const periods = useMyOpenExamPeriods();
  const mine = useMyExamRegistrations();
  if (periods.isLoading || mine.isLoading) return <LoadingBlock label="Loading exam registration..." />;
  if (periods.isError || !periods.data) return <ErrorBanner error={periods.error} fallback="Unable to load exam periods." title="Error Loading Exam Registration" />;
  const registrations = mine.data ?? [];
  const openIds = new Set(periods.data.map((p) => p.period.id));
  const history = registrations.filter((r) => !openIds.has(r.examPeriodId));

  return (
    <div className="space-y-6">
      {periods.data.length === 0 ? (
        <Card><EmptyBlock icon={<CalendarCheck className="w-10 h-10" />} title="No exam registration is currently open." /></Card>
      ) : (
        periods.data.map((item) => (
          <StudentPeriod key={item.period.id} item={item} registration={registrations.find((r) => r.examPeriodId === item.period.id)} />
        ))
      )}
      {mine.isError && <ErrorBanner error={mine.error} fallback="Unable to load your past registrations." />}
      {history.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[#111111]">Earlier registrations</h3>
          {history.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5 space-y-2">
                <p className="text-sm font-semibold text-[#111111]">{r.examPeriodName} <Badge variant="outline">{EXAM_TYPE_LABELS[r.examType]}</Badge></p>
                <RegistrationSummary registration={r} />
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

// ---------- HOD: exam periods ----------

function PeriodForm({ period, onSaved }: { period?: ExamPeriod; onSaved: () => void }) {
  const action = useExamPeriodAction();
  const termLocked = period?.status === 'OPEN';
  const [form, setForm] = useState({
    name: period?.name ?? '',
    academicYear: period?.academicYear ?? '',
    semester: period ? String(period.semester) : '',
    examType: (period?.examType ?? 'INTERNAL') as ExamType,
    registrationStart: period?.registrationStart ?? '',
    registrationEnd: period?.registrationEnd ?? '',
  });
  const [problem, setProblem] = useState('');
  const set = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setProblem(''); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.semester || !form.registrationStart || !form.registrationEnd) return setProblem('All fields are required.');
    if (!ACADEMIC_YEAR_PATTERN.test(form.academicYear.trim())) return setProblem('Academic year must look like 2026-2027.');
    if (form.registrationEnd < form.registrationStart) return setProblem('Registration end cannot be before registration start.');
    action.mutate({
      action: 'save',
      id: period?.id,
      payload: {
        name: form.name.trim(), academicYear: form.academicYear.trim(), semester: Number(form.semester), examType: form.examType,
        registrationStart: form.registrationStart, registrationEnd: form.registrationEnd,
      },
    }, { onSuccess: onSaved });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {termLocked && <p className="text-xs text-[#92400E]">This period is open: only the name and registration dates can change.</p>}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="ep-name">Name</FieldLabel>
        <Input id="ep-name" maxLength={150} value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="ep-year">Academic Year</FieldLabel>
          <Input id="ep-year" placeholder="2026-2027" disabled={termLocked} value={form.academicYear} onChange={(e) => set({ academicYear: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="ep-sem">Semester</FieldLabel>
          <select id="ep-sem" className={`${SELECT_CLASS} w-full`} disabled={termLocked} value={form.semester} onChange={(e) => set({ semester: e.target.value })}>
            <option value="">Select…</option>
            {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 col-span-2">
          <FieldLabel htmlFor="ep-type">Exam Type</FieldLabel>
          <select id="ep-type" className={`${SELECT_CLASS} w-full`} disabled={termLocked} value={form.examType} onChange={(e) => set({ examType: e.target.value as ExamType })}>
            {EXAM_TYPES.map((t) => <option key={t} value={t}>{EXAM_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="ep-start">Registration Start</FieldLabel>
          <Input id="ep-start" type="date" value={form.registrationStart} onChange={(e) => set({ registrationStart: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="ep-end">Registration End</FieldLabel>
          <Input id="ep-end" type="date" value={form.registrationEnd} onChange={(e) => set({ registrationEnd: e.target.value })} />
        </div>
      </div>
      {problem && <p className="text-sm text-red-600" role="alert">{problem}</p>}
      {action.isError && <FormError error={action.error} fallback="Unable to save the exam period." />}
      <Button type="submit" isLoading={action.isPending}>{period ? 'Save Changes' : 'Create Exam Period'}</Button>
    </form>
  );
}

function PeriodsTab() {
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<{ mode: 'create' } | { mode: 'edit'; period: ExamPeriod } | null>(null);
  const [confirm, setConfirm] = useState<{ period: ExamPeriod; action: 'open' | 'close' } | null>(null);
  const { data, isLoading, isError, error } = useExamPeriods({ page, size: 20 });
  const action = useExamPeriodAction();

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setPanel({ mode: 'create' })}><Plus className="w-4 h-4 mr-1.5" /> New Exam Period</Button>
      {action.isError && <FormError error={action.error} fallback="Unable to change the exam period." />}
      {confirm && (
        <ConfirmBox
          message={confirm.action === 'open'
            ? <>Open registration for <strong>{confirm.period.name}</strong>? Students enrolled in that term are notified by the system.</>
            : <>Close registration for <strong>{confirm.period.name}</strong>? A closed period cannot be reopened or edited.</>}
          confirmLabel={confirm.action === 'open' ? 'Open Registration' : 'Close Registration'}
          variant={confirm.action === 'close' ? 'danger' : 'primary'}
          isLoading={action.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => action.mutate({ action: confirm.action, id: confirm.period.id }, { onSettled: () => setConfirm(null) })}
        />
      )}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {isLoading ? <LoadingBlock label="Loading exam periods..." />
            : isError || !data ? <ErrorBanner error={error} fallback="Unable to load exam periods." />
            : data.content.length === 0 ? <Card><EmptyBlock icon={<CalendarCheck className="w-10 h-10" />} title="No exam periods yet." /></Card>
            : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="whitespace-nowrap">Term</TableHead>
                      <TableHead className="whitespace-nowrap">Registration Window</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.content.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-[#666666]">{EXAM_TYPE_LABELS[p.examType]}</TableCell>
                        <TableCell className="whitespace-nowrap text-[#666666]">{p.academicYear} · S{p.semester}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(p.registrationStart)} – {formatDate(p.registrationEnd)}
                          {p.registrationWindowOpen && <span className="block text-[11px] text-green-700">Open now</span>}
                        </TableCell>
                        <TableCell><StatusBadge info={EXAM_PERIOD_STATUS_BADGE[p.status]} /></TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {p.status !== 'CLOSED' && <Button size="sm" variant="ghost" onClick={() => setPanel({ mode: 'edit', period: p })}>Edit</Button>}
                          {p.status === 'DRAFT' && <Button size="sm" variant="ghost" onClick={() => { action.reset(); setConfirm({ period: p, action: 'open' }); }}>Open</Button>}
                          {p.status === 'OPEN' && <Button size="sm" variant="ghost" onClick={() => { action.reset(); setConfirm({ period: p, action: 'close' }); }}>Close</Button>}
                          {p.status === 'CLOSED' && <span className="text-xs text-[#9A9A9A]">Final</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination data={data} onPageChange={setPage} />
              </Card>
            )}
        </div>
        {panel && (
          <SidePanel title={panel.mode === 'create' ? 'New Exam Period' : 'Edit Exam Period'} onClose={() => setPanel(null)}>
            <PeriodForm key={panel.mode === 'edit' ? panel.period.id : 'new'} period={panel.mode === 'edit' ? panel.period : undefined} onSaved={() => setPanel(null)} />
          </SidePanel>
        )}
      </div>
    </div>
  );
}

// ---------- HOD: registrations ----------

function ReviewPanel({ registration, onReviewed }: { registration: ExamRegistration; onReviewed: (r: ExamRegistration) => void }) {
  const review = useReviewRegistration();
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const noteTooShort = note.trim().length < MIN_REJECTION_NOTE;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Student" value={registration.studentName} />
        <DetailField label="Register No." value={<span className="font-mono text-xs">{registration.registerNumber}</span>} />
        <DetailField label="Section" value={registration.sectionName} />
        <DetailField label="Exam Period" value={registration.examPeriodName} />
      </div>
      <RegistrationSummary registration={registration} />
      {registration.status === 'SUBMITTED' ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="review-note">Review note (required to reject, {MIN_REJECTION_NOTE}+ characters)</FieldLabel>
            <textarea id="review-note" rows={3} maxLength={500} className={TEXTAREA_CLASS} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {review.isError && <FormError error={review.error} fallback="Unable to review the registration." />}
          {decision ? (
            <ConfirmBox
              message={decision === 'approve' ? 'Approve this registration? The student is notified.' : 'Reject this registration? The student is notified and can resubmit.'}
              confirmLabel={decision === 'approve' ? 'Approve' : 'Reject'}
              variant={decision === 'reject' ? 'danger' : 'primary'}
              isLoading={review.isPending}
              onCancel={() => setDecision(null)}
              onConfirm={() => review.mutate({ id: registration.id, decision, reviewNote: note.trim() || null }, {
                onSuccess: (r) => { setDecision(null); onReviewed(r); },
                onError: () => setDecision(null),
              })}
            />
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { review.reset(); setDecision('approve'); }}>Approve</Button>
              <Button size="sm" variant="danger" disabled={noteTooShort} title={noteTooShort ? `Enter a reason of at least ${MIN_REJECTION_NOTE} characters` : undefined}
                onClick={() => { review.reset(); setDecision('reject'); }}>Reject</Button>
            </div>
          )}
        </div>
      ) : (
        <ReadOnlyNote>Only submitted registrations can be approved or rejected.</ReadOnlyNote>
      )}
    </div>
  );
}

function RegistrationsTab() {
  const periods = useAllExamPeriods();
  const sections = useSections(null);
  const [filters, setFilters] = useState({ examPeriodId: '', status: 'SUBMITTED', sectionId: '' });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ExamRegistration | null>(null);
  const set = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); setPage(0); };

  const { data, isLoading, isError, error, isFetching } = useExamRegistrations({
    page, size: 50,
    examPeriodId: filters.examPeriodId ? Number(filters.examPeriodId) : undefined,
    status: (filters.status || undefined) as ExamRegistrationStatus | undefined,
    sectionId: filters.sectionId ? Number(filters.sectionId) : undefined,
  });

  return (
    <div className="space-y-4">
      <FilterBar>
        <select aria-label="Filter by exam period" className={SELECT_CLASS} value={filters.examPeriodId} onChange={(e) => set({ examPeriodId: e.target.value })}>
          <option value="">All Exam Periods</option>
          {(periods.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Filter by status" className={SELECT_CLASS} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">All Statuses</option>
          {EXAM_REGISTRATION_STATUSES.map((s) => <option key={s} value={s}>{EXAM_REGISTRATION_STATUS_BADGE[s].label}</option>)}
        </select>
        <select aria-label="Filter by section" className={SELECT_CLASS} value={filters.sectionId} onChange={(e) => set({ sectionId: e.target.value })}>
          <option value="">All Sections</option>
          {(sections.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.batchName} — Sec {s.name}</option>)}
        </select>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </FilterBar>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {isLoading ? <LoadingBlock label="Loading registrations..." />
            : isError || !data ? <ErrorBanner error={error} fallback="Unable to load exam registrations." />
            : data.content.length === 0 ? <Card><EmptyBlock icon={<FileCheck2 className="w-10 h-10" />} title="No registrations match these filters." /></Card>
            : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Exam Period</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.content.map((r) => (
                      <TableRow key={r.id} onClick={() => setSelected(r)} className={`cursor-pointer ${selected?.id === r.id ? 'bg-[#F5F5F5]' : ''}`}>
                        <TableCell className="whitespace-nowrap">
                          <button className="font-medium hover:underline underline-offset-2 text-left" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>{r.studentName}</button>
                          <div className="font-mono text-[11px] text-[#9A9A9A]">{r.registerNumber} · Sec {r.sectionName}</div>
                        </TableCell>
                        <TableCell>{r.examPeriodName}</TableCell>
                        <TableCell className="text-[#666666]">{r.subjects.map((s) => s.subjectCode).join(', ')}</TableCell>
                        <TableCell className="whitespace-nowrap text-[#666666]">{formatDateTime(r.submittedAt)}</TableCell>
                        <TableCell><StatusBadge info={EXAM_REGISTRATION_STATUS_BADGE[r.status]} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination data={data} onPageChange={setPage} />
              </Card>
            )}
        </div>
        {selected && (
          <SidePanel title="Exam Registration" onClose={() => setSelected(null)}>
            <ReviewPanel key={`${selected.id}-${selected.status}`} registration={selected} onReviewed={setSelected} />
          </SidePanel>
        )}
      </div>
    </div>
  );
}

function HodExamRegistration() {
  const [tab, setTab] = useState<'registrations' | 'periods'>('registrations');
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-[10px] border border-[#E8E8E8] overflow-hidden" role="tablist" aria-label="Exam registration views">
        {(['registrations', 'periods'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`px-4 h-9 text-sm font-medium ${tab === t ? 'bg-[#111111] text-white' : 'bg-white text-[#666666] hover:bg-[#F5F5F5]'}`}>
            {t === 'registrations' ? 'Registrations' : 'Exam Periods'}
          </button>
        ))}
      </div>
      {tab === 'registrations' ? <RegistrationsTab /> : <PeriodsTab />}
    </div>
  );
}

function ExamRegistrationView() {
  const { hasRole } = useAuth();
  return <PageContainer rawLayout>{hasRole('ROLE_HOD') ? <HodExamRegistration /> : <StudentExamRegistration />}</PageContainer>;
}

export default function ExamRegistrationPage() {
  // STAFF have no access to exam registrations on the backend.
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STUDENT']}>
      <ExamRegistrationView />
    </RequireRole>
  );
}
