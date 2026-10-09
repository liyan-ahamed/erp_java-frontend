'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Save, Send } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, LoadingBlock } from '@/components/gradebook/shared';
import { ConfirmBox } from '@/components/portfolio/shared';
import { FilterBar, ReadOnlyNote, StatTile, StatusBadge, SuccessNote, offeringOptionLabel, parseRowErrors } from '@/components/erp/shared';
import { useAuth } from '@/contexts/auth-context';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import { useAllExamPeriods } from '@/hooks/useExams';
import { useMyResults, usePublishResults, useResultSheet, useResults, useSaveResults } from '@/hooks/useResults';
import { getApiErrorMessage } from '@/lib/api-error';
import { SELECT_CLASS, formatDateTime, formatMarks } from '@/lib/gradebook-labels';
import { EXAM_TYPE_LABELS, PUBLISHED_BADGE, RESULT_STATUSES, RESULT_STATUS_BADGE } from '@/lib/erp-labels';
import { ExamResult, NOT_ENTERED, ResultEntry, ResultSheetRow, ResultSheetStatus, ResultStatus } from '@/types/result';

// ---------- STUDENT ----------

function StudentResults() {
  const { data, isLoading, isError, error } = useMyResults();
  const groups = useMemo(() => {
    const map = new Map<number, ExamResult[]>();
    data?.forEach((r) => map.set(r.examPeriodId, [...(map.get(r.examPeriodId) ?? []), r]));
    return [...map.values()];
  }, [data]);

  if (isLoading) return <LoadingBlock label="Loading your results..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load your results." title="Error Loading Results" />;
  if (groups.length === 0) return <Card><EmptyBlock icon={<Award className="w-10 h-10" />} title="No published results available." /></Card>;

  return (
    <div className="space-y-6">
      {groups.map((rows) => {
        const first = rows[0];
        return (
          <Card key={first.examPeriodId}>
            <div className="px-6 py-4 border-b border-[#F5F5F5]">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-[#111111]">{first.examPeriodName}</h3>
                <Badge variant="outline">{EXAM_TYPE_LABELS[first.examType]}</Badge>
              </div>
              <p className="text-xs text-[#9A9A9A] mt-0.5">{first.academicYear} · Semester {first.semester}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Maximum</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{r.subjectCode}</TableCell>
                    <TableCell className="font-medium">
                      {r.subjectName}
                      {r.remarks && <div className="text-xs text-[#9A9A9A] font-normal mt-0.5">{r.remarks}</div>}
                    </TableCell>
                    <TableCell className="text-right">{formatMarks(r.marksObtained)}</TableCell>
                    <TableCell className="text-right text-[#666666]">{formatMarks(r.maxMarks)}</TableCell>
                    <TableCell>{r.grade ?? '—'}</TableCell>
                    <TableCell><StatusBadge info={RESULT_STATUS_BADGE[r.resultStatus]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );
      })}
      <p className="text-xs text-[#9A9A9A]">Only published results are shown. No GPA/CGPA is calculated by this ERP.</p>
    </div>
  );
}

// ---------- STAFF / HOD: result sheet ----------

interface RowDraft {
  status: ResultSheetStatus;
  marks: string;
  max: string;
  grade: string;
  remarks: string;
}

const num = (v: number | null) => (v === null || v === undefined ? '' : String(Number(v)));
const draftOf = (r: ResultSheetRow): RowDraft => ({ status: r.resultStatus, marks: num(r.marksObtained), max: num(r.maxMarks), grade: r.grade ?? '', remarks: r.remarks ?? '' });
const sameDraft = (a: RowDraft, b: RowDraft) =>
  a.status === b.status && a.marks.trim() === b.marks.trim() && a.max.trim() === b.max.trim() &&
  a.grade.trim().toUpperCase() === b.grade.trim().toUpperCase() && a.remarks.trim() === b.remarks.trim();

const DECIMAL = /^\d{1,4}(\.\d{1,2})?$/;

/** Light checks mirroring the backend rules; the backend re-validates every row. */
const rowProblem = (d: RowDraft): string | null => {
  if (d.status === NOT_ENTERED) return 'Choose a result status.';
  if (!d.max.trim()) return 'Maximum marks are required.';
  if (!DECIMAL.test(d.max.trim()) || Number(d.max) <= 0) return 'Maximum must be a positive number (2 decimals max).';
  if (d.status === 'ABSENT') {
    if (d.marks.trim() || d.grade.trim()) return 'Absent results have no marks and no grade.';
  } else if (d.status === 'PASS' || d.status === 'FAIL') {
    if (!d.marks.trim()) return 'Marks are required for Pass / Fail.';
  }
  if (d.marks.trim()) {
    if (!DECIMAL.test(d.marks.trim())) return 'Marks must be a number with at most 2 decimals.';
    if (Number(d.marks) > Number(d.max)) return 'Marks cannot exceed the maximum.';
  }
  if (d.grade.trim() && !/^[A-Za-z+-]{1,5}$/.test(d.grade.trim())) return 'Grade must be 1–5 letters, + or -.';
  return null;
};

function ResultSheetEditor({ offeringId, periodId, canEdit, canPublish }: { offeringId: number; periodId: number; canEdit: boolean; canPublish: boolean }) {
  const { data, isLoading, isError, error, isFetching } = useResultSheet(offeringId, periodId);
  const save = useSaveResults();
  const publish = usePublishResults();
  const [edits, setEdits] = useState<Record<number, RowDraft>>({});
  const [bulkMax, setBulkMax] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<'publish' | 'discard' | null>(null);

  const originals = useMemo(() => {
    const map = new Map<number, RowDraft>();
    data?.rows.forEach((r) => map.set(r.studentId, draftOf(r)));
    return map;
  }, [data]);
  const changedIds = useMemo(() => Object.keys(edits).map(Number).filter((id) => {
    const o = originals.get(id);
    return o && !sameDraft(o, edits[id]);
  }), [edits, originals]);
  const dirty = changedIds.length > 0;
  const problems = useMemo(() => {
    const map = new Map<number, string>();
    changedIds.forEach((id) => { const p = rowProblem(edits[id]); if (p) map.set(id, p); });
    return map;
  }, [changedIds, edits]);
  const serverErrors = useMemo(() => parseRowErrors(save.error), [save.error]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (isLoading) return <LoadingBlock label="Loading result sheet..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load the result sheet." />;

  const unpublishedEntered = data.entered - data.published;
  const draftFor = (r: ResultSheetRow) => edits[r.studentId] ?? originals.get(r.studentId)!;
  const rowEditable = (r: ResultSheetRow) => canEdit && !r.published && r.enrolled;
  const update = (r: ResultSheetRow, patch: Partial<RowDraft>) => {
    setMessage('');
    setEdits((old) => {
      const next = { ...(old[r.studentId] ?? originals.get(r.studentId)!), ...patch };
      if (next.status === 'ABSENT') { next.marks = ''; next.grade = ''; }
      return { ...old, [r.studentId]: next };
    });
  };
  /** Local convenience: fills the maximum for every editable row (nothing is sent until Save). */
  const applyMax = () => {
    if (!DECIMAL.test(bulkMax.trim())) return;
    setEdits((old) => {
      const next = { ...old };
      data.rows.filter(rowEditable).forEach((r) => { next[r.studentId] = { ...(old[r.studentId] ?? originals.get(r.studentId)!), max: bulkMax.trim() }; });
      return next;
    });
  };

  const onSave = () => {
    if (problems.size > 0) return;
    const results: ResultEntry[] = changedIds.map((id) => {
      const d = edits[id];
      return {
        studentId: id,
        resultStatus: d.status as ResultStatus,
        marksObtained: d.marks.trim() ? Number(d.marks) : null,
        maxMarks: Number(d.max),
        grade: d.grade.trim() || null,
        remarks: d.remarks.trim() || null,
      };
    });
    save.mutate({ offeringId, periodId, payload: { results } }, {
      onSuccess: (b) => { setEdits({}); setMessage(`Saved — ${b.created} added, ${b.updated} updated.`); },
    });
  };

  const inputClass = (bad: boolean) =>
    `h-9 px-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-1 disabled:bg-[#F5F5F5] disabled:text-[#9A9A9A] disabled:cursor-not-allowed ${bad ? 'border-red-400 focus:ring-red-500' : 'border-[#E8E8E8] focus:ring-[#111111]'}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <StatTile label="Students" value={data.students} />
        <StatTile label="Entered" value={data.entered} />
        <StatTile label="Published" value={data.published} />
      </div>
      {!canEdit && !canPublish && <ReadOnlyNote>Read-only view.</ReadOnlyNote>}
      {canPublish && <ReadOnlyNote>Results are entered by the assigned staff member. HOD reviews and publishes; published results become visible to students and cannot be changed.</ReadOnlyNote>}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">{data.subjectCode} — {data.subjectName} · Sec {data.sectionName}</CardTitle>
            <p className="text-xs text-[#9A9A9A] mt-1">{data.examPeriodName} {isFetching && <Spinner size="sm" />}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <>
                <input aria-label="Maximum marks for all rows" placeholder="Max for all" value={bulkMax} onChange={(e) => setBulkMax(e.target.value)} className={`${inputClass(false)} w-24`} />
                <Button size="sm" variant="secondary" onClick={applyMax} disabled={!DECIMAL.test(bulkMax.trim())}>Apply Max</Button>
                {dirty && <Badge variant="warning">{changedIds.length} unsaved change{changedIds.length === 1 ? '' : 's'}</Badge>}
                {dirty && <Button size="sm" variant="ghost" onClick={() => setConfirm('discard')}>Discard</Button>}
                <Button size="sm" onClick={onSave} isLoading={save.isPending} disabled={!dirty || problems.size > 0}>
                  {!save.isPending && <Save className="w-3.5 h-3.5 mr-1.5" />} Save Results
                </Button>
              </>
            )}
            {canPublish && (
              <Button size="sm" onClick={() => { publish.reset(); setConfirm('publish'); }} disabled={unpublishedEntered <= 0}>
                <Send className="w-3.5 h-3.5 mr-1.5" /> Publish {unpublishedEntered > 0 ? `(${unpublishedEntered})` : ''}
              </Button>
            )}
          </div>
        </CardHeader>
        <div className="px-6 pt-4 space-y-2 empty:hidden">
          {confirm === 'publish' && (
            <ConfirmBox
              message={<>Publish {unpublishedEntered} unpublished result(s) for <strong>{data.subjectCode}</strong> in <strong>{data.examPeriodName}</strong>? Students will see them and be notified. Published results cannot be edited.</>}
              confirmLabel="Publish Results" isLoading={publish.isPending} onCancel={() => setConfirm(null)}
              onConfirm={() => publish.mutate({ offeringId, periodId }, { onSettled: () => setConfirm(null), onSuccess: (b) => setMessage(`${b.published} result(s) published.`) })}
            />
          )}
          {confirm === 'discard' && (
            <ConfirmBox message="Discard all unsaved changes?" confirmLabel="Discard" variant="danger"
              onCancel={() => setConfirm(null)} onConfirm={() => { setEdits({}); save.reset(); setConfirm(null); }} />
          )}
          {message && <SuccessNote>{message}</SuccessNote>}
          {problems.size > 0 && <p className="text-sm text-red-600" role="alert">Fix {problems.size} highlighted row(s) before saving.</p>}
          {publish.isError && <div className="rounded-[10px] bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">{getApiErrorMessage(publish.error, 'Unable to publish results.')}</div>}
          {save.isError && (
            <div className="rounded-[10px] bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
              {serverErrors.byStudent.size > 0 || serverErrors.other.length > 0 ? (
                <>
                  <p className="font-medium">{serverErrors.message}</p>
                  {serverErrors.byStudent.size > 0 && <p className="mt-1">{serverErrors.byStudent.size} row(s) rejected — see the highlighted students. Nothing was saved.</p>}
                  {serverErrors.other.map((l) => <p key={l} className="mt-1">{l}</p>)}
                </>
              ) : <p>{getApiErrorMessage(save.error, 'Unable to save results.')}</p>}
            </div>
          )}
        </div>
        {data.rows.length === 0 ? (
          <EmptyBlock icon={<Award className="w-10 h-10" />} title="No students are enrolled in this subject offering." />
        ) : (
          <div className="overflow-x-auto pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Register No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Maximum</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="min-w-40">Remarks</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => {
                  const d = draftFor(r);
                  const editable = rowEditable(r);
                  const changed = changedIds.includes(r.studentId);
                  const problem = (changed ? problems.get(r.studentId) : undefined) ?? serverErrors.byStudent.get(r.studentId);
                  return (
                    <TableRow key={r.studentId} className={problem ? 'bg-red-50/60' : changed ? 'bg-[#FFFBEB]' : ''}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{r.registerNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium whitespace-nowrap">{r.studentName}</div>
                        {!r.enrolled && <div className="text-[11px] text-[#9A9A9A]">No longer enrolled</div>}
                        {problem && <div className="text-xs text-red-600 mt-0.5">{problem}</div>}
                      </TableCell>
                      <TableCell>
                        {editable ? (
                          <select aria-label={`Result status for ${r.studentName}`} value={d.status}
                            onChange={(e) => update(r, { status: e.target.value as ResultSheetStatus })}
                            className={`${inputClass(false)} w-32`}>
                            {d.status === NOT_ENTERED && <option value={NOT_ENTERED} disabled>Not entered</option>}
                            {RESULT_STATUSES.map((s) => <option key={s} value={s}>{RESULT_STATUS_BADGE[s].label}</option>)}
                          </select>
                        ) : <StatusBadge info={RESULT_STATUS_BADGE[d.status]} />}
                      </TableCell>
                      <TableCell>
                        {editable ? (
                          <input aria-label={`Marks for ${r.studentName}`} inputMode="decimal" value={d.marks} disabled={d.status === 'ABSENT'}
                            onChange={(e) => update(r, { marks: e.target.value })} className={`${inputClass(!!problem)} w-20`} />
                        ) : formatMarks(r.marksObtained)}
                      </TableCell>
                      <TableCell>
                        {editable ? (
                          <input aria-label={`Maximum marks for ${r.studentName}`} inputMode="decimal" value={d.max}
                            onChange={(e) => update(r, { max: e.target.value })} className={`${inputClass(!!problem)} w-20`} />
                        ) : formatMarks(r.maxMarks)}
                      </TableCell>
                      <TableCell>
                        {editable ? (
                          <input aria-label={`Grade for ${r.studentName}`} maxLength={5} value={d.grade} disabled={d.status === 'ABSENT'}
                            onChange={(e) => update(r, { grade: e.target.value })} className={`${inputClass(false)} w-16`} />
                        ) : (r.grade ?? '—')}
                      </TableCell>
                      <TableCell>
                        {editable ? (
                          <input aria-label={`Remarks for ${r.studentName}`} maxLength={255} value={d.remarks}
                            onChange={(e) => update(r, { remarks: e.target.value })} className={`${inputClass(false)} w-full min-w-36`} />
                        ) : <span className="text-[#666666]">{r.remarks || '—'}</span>}
                      </TableCell>
                      <TableCell>{r.resultStatus === NOT_ENTERED ? '—' : <StatusBadge info={PUBLISHED_BADGE(r.published)} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SheetSelector({ isHod }: { isHod: boolean }) {
  const periods = useAllExamPeriods();
  const offerings = useAllSubjectOfferings();
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [offeringId, setOfferingId] = useState<number | null>(null);
  // Results cannot be entered for DRAFT periods; the offering's term must match the period's.
  const usablePeriods = (periods.data ?? []).filter((p) => p.status !== 'DRAFT');
  const period = usablePeriods.find((p) => p.id === periodId);
  const matchingOfferings = (offerings.data ?? []).filter((o) => !period || (o.academicYear === period.academicYear && o.semester === period.semester));

  if (periods.isLoading || offerings.isLoading) return <LoadingBlock label="Loading..." />;
  if (periods.isError || offerings.isError) return <ErrorBanner error={periods.error ?? offerings.error} fallback="Unable to load exam periods or offerings." />;

  return (
    <div className="space-y-4">
      <FilterBar>
        <select aria-label="Exam period" className={SELECT_CLASS} value={periodId ?? ''} onChange={(e) => { setPeriodId(e.target.value ? Number(e.target.value) : null); setOfferingId(null); }}>
          <option value="">Select an exam period…</option>
          {usablePeriods.map((p) => <option key={p.id} value={p.id}>{p.name} ({EXAM_TYPE_LABELS[p.examType]})</option>)}
        </select>
        <select aria-label="Subject offering" className={SELECT_CLASS} value={offeringId ?? ''} disabled={!period} onChange={(e) => setOfferingId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">{period && matchingOfferings.length === 0 ? 'No offerings in this term' : 'Select a subject offering…'}</option>
          {matchingOfferings.map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}{isHod ? ` — ${o.staffName}` : ''}</option>)}
        </select>
      </FilterBar>
      {periodId === null || offeringId === null ? (
        <Card><EmptyBlock icon={<Award className="w-10 h-10" />} title="Choose an exam period and a subject offering." hint={isHod ? undefined : 'Only your own subject offerings are listed.'} /></Card>
      ) : (
        <ResultSheetEditor key={`${offeringId}-${periodId}`} offeringId={offeringId} periodId={periodId} canEdit={!isHod} canPublish={isHod} />
      )}
    </div>
  );
}

// ---------- HOD: all results ----------

function AllResults() {
  const periods = useAllExamPeriods();
  const [filters, setFilters] = useState({ examPeriodId: '', published: '' });
  const [page, setPage] = useState(0);
  const set = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); setPage(0); };
  const { data, isLoading, isError, error, isFetching } = useResults({
    page, size: 50,
    examPeriodId: filters.examPeriodId ? Number(filters.examPeriodId) : undefined,
    published: filters.published === '' ? undefined : filters.published === 'true',
  });

  return (
    <div className="space-y-4">
      <FilterBar>
        <select aria-label="Filter by exam period" className={SELECT_CLASS} value={filters.examPeriodId} onChange={(e) => set({ examPeriodId: e.target.value })}>
          <option value="">All Exam Periods</option>
          {(periods.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Filter by publication" className={SELECT_CLASS} value={filters.published} onChange={(e) => set({ published: e.target.value })}>
          <option value="">Published and Unpublished</option>
          <option value="false">Unpublished</option>
          <option value="true">Published</option>
        </select>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </FilterBar>
      {isLoading ? <LoadingBlock label="Loading results..." />
        : isError || !data ? <ErrorBanner error={error} fallback="Unable to load results." />
        : data.content.length === 0 ? <Card><EmptyBlock icon={<Award className="w-10 h-10" />} title="No results match these filters." /></Card>
        : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Exam Period</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Publication</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">{r.studentName}</div>
                      <div className="font-mono text-[11px] text-[#9A9A9A]">{r.registerNumber} · Sec {r.sectionName}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap"><span className="font-mono text-xs text-[#9A9A9A] mr-1">{r.subjectCode}</span>{r.subjectName}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.examPeriodName}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatMarks(r.marksObtained)} / {formatMarks(r.maxMarks)}</TableCell>
                    <TableCell>{r.grade ?? '—'}</TableCell>
                    <TableCell><StatusBadge info={RESULT_STATUS_BADGE[r.resultStatus]} /></TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge info={PUBLISHED_BADGE(r.published)} />
                      {r.publishedAt && <div className="text-[11px] text-[#9A9A9A]">{formatDateTime(r.publishedAt)}</div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination data={data} onPageChange={setPage} />
          </Card>
        )}
    </div>
  );
}

function HodResults() {
  const [tab, setTab] = useState<'sheet' | 'all'>('sheet');
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-[10px] border border-[#E8E8E8] overflow-hidden" role="tablist" aria-label="Result views">
        {(['sheet', 'all'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`px-4 h-9 text-sm font-medium ${tab === t ? 'bg-[#111111] text-white' : 'bg-white text-[#666666] hover:bg-[#F5F5F5]'}`}>
            {t === 'sheet' ? 'Review & Publish' : 'All Results'}
          </button>
        ))}
      </div>
      {tab === 'sheet' ? <SheetSelector isHod /> : <AllResults />}
    </div>
  );
}

function ResultsView() {
  const { hasRole } = useAuth();
  return (
    <PageContainer rawLayout>
      {hasRole('ROLE_HOD') ? <HodResults /> : hasRole('ROLE_STAFF') ? <SheetSelector isHod={false} /> : <StudentResults />}
    </PageContainer>
  );
}

export default function ResultsPage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT']}>
      <ResultsView />
    </RequireRole>
  );
}
