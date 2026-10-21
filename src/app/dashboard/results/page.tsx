'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Award, Save, Send } from '@/components/ui/icons';
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
import { FilterBar, ReadOnlyNote, StatTile, StatusBadge, SuccessNote, parseRowErrors } from '@/components/erp/shared';
import { AcademicContextFilter, OfferingPicker } from '@/components/academic/AcademicContextFilter';
import { ContextPrompt, missingContext } from '@/components/academic/ContextGate';
import { AcademicContext, EMPTY_CONTEXT, resolveRow } from '@/lib/academic-context';
import { useCohortsIn } from '@/hooks/useAcademic';
import { useAuth } from '@/contexts/auth-context';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import { useAllExamPeriods } from '@/hooks/useExams';
import { useMyResults, usePublishResults, useResultSheet, useResults, useSaveResults } from '@/hooks/useResults';
import { getApiErrorMessage } from '@/lib/api-error';
import { SELECT_CLASS, formatDateTime, formatMarks } from '@/lib/gradebook-labels';
import { EXAM_TYPE_LABELS, PUBLISHED_BADGE, RESULT_STATUSES, RESULT_STATUS_BADGE } from '@/lib/erp-labels';
import { ExamResult, NOT_ENTERED, ResultEntry, ResultSheetRow, ResultSheetStatus, ResultStatus } from '@/types/result';
import { Tabs } from '@/components/ui/Tabs';
import { StaffResults } from '@/components/results/StaffResults';

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
            <div className="px-6 py-4 border-b border-line">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-[550] text-fg">{first.examPeriodName}</h3>
                <Badge variant="outline">{EXAM_TYPE_LABELS[first.examType]}</Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">{first.academicYear} · Semester {first.semester}</p>
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
                      {r.remarks && <div className="text-xs text-muted font-normal mt-0.5">{r.remarks}</div>}
                    </TableCell>
                    <TableCell className="text-right">{formatMarks(r.marksObtained)}</TableCell>
                    <TableCell className="text-right text-muted">{formatMarks(r.maxMarks)}</TableCell>
                    <TableCell>{r.grade ?? '—'}</TableCell>
                    <TableCell><StatusBadge info={RESULT_STATUS_BADGE[r.resultStatus]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );
      })}
      <p className="text-xs text-muted">Only published results are shown. No GPA/CGPA is calculated by this ERP.</p>
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
    `h-9 px-2 text-[12px] border rounded-[6px] bg-soft text-fg disabled:opacity-60 disabled:cursor-not-allowed ${bad ? 'border-danger' : 'border-line'}`;

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
            <p className="text-xs text-muted mt-1">{data.examPeriodName} {isFetching && <Spinner size="sm" />}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <>
                <input aria-label="Maximum marks for all rows" placeholder="Max for all" value={bulkMax} onChange={(e) => setBulkMax(e.target.value)} className={`${inputClass(false)} w-24`} />
                <Button size="sm" variant="secondary" onClick={applyMax} disabled={!DECIMAL.test(bulkMax.trim())}>Apply Max</Button>
                {dirty && <Badge variant="warning">{changedIds.length} unsaved change{changedIds.length === 1 ? '' : 's'}</Badge>}
                {dirty && <Button size="sm" variant="ghost" onClick={() => setConfirm('discard')}>Discard</Button>}
                <Button size="sm" onClick={onSave} isLoading={save.isPending} disabled={!dirty || problems.size > 0}>
                  {!save.isPending && <Save className="w-3.5 h-3.5" />} Save Results
                </Button>
              </>
            )}
            {canPublish && (
              <Button size="sm" onClick={() => { publish.reset(); setConfirm('publish'); }} disabled={unpublishedEntered <= 0}>
                <Send className="w-3.5 h-3.5" /> Publish {unpublishedEntered > 0 ? `(${unpublishedEntered})` : ''}
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
          {problems.size > 0 && <p className="text-sm text-danger" role="alert">Fix {problems.size} highlighted row(s) before saving.</p>}
          {publish.isError && <div className="rounded-[10px] bg-danger-soft p-3 text-sm text-danger border border-danger/20" role="alert">{getApiErrorMessage(publish.error, 'Unable to publish results.')}</div>}
          {save.isError && (
            <div className="rounded-[10px] bg-danger-soft p-3 text-sm text-danger border border-danger/20" role="alert">
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
                    <TableRow key={r.studentId} className={problem ? 'bg-danger-soft' : changed ? 'bg-warn-soft' : ''}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{r.registerNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium whitespace-nowrap">{r.studentName}</div>
                        {!r.enrolled && <div className="text-[11px] text-muted">No longer enrolled</div>}
                        {problem && <div className="text-xs text-danger mt-0.5">{problem}</div>}
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
                        ) : <span className="text-muted">{r.remarks || '—'}</span>}
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

/** HOD: pick an exam period and class, then review and publish. (STAFF use the read-only StaffResults.) */
function SheetSelector({ isHod }: { isHod: boolean }) {
  const periods = useAllExamPeriods();
  const offerings = useAllSubjectOfferings();
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [offeringId, setOfferingId] = useState<number | null>(null);
  // Results cannot be entered for DRAFT periods; the offering's term must match the period's.
  const usablePeriods = (periods.data ?? []).filter((p) => p.status !== 'DRAFT');
  const period = usablePeriods.find((p) => p.id === periodId);
  const matchingOfferings = (offerings.data ?? []).filter((o) => !period || (o.academicYear === period.academicYear && o.semester === period.semester));
  const cohorts = useCohortsIn(matchingOfferings);
  const selected = matchingOfferings.find((o) => o.id === offeringId);

  if (periods.isLoading || offerings.isLoading) return <LoadingBlock label="Loading..." />;
  if (periods.isError || offerings.isError) return <ErrorBanner error={periods.error ?? offerings.error} fallback="Unable to load exam periods or offerings." />;

  return (
    <div className="space-y-4">
      <FilterBar>
        <select aria-label="Exam period" className={SELECT_CLASS} value={periodId ?? ''} onChange={(e) => { setPeriodId(e.target.value ? Number(e.target.value) : null); setOfferingId(null); }}>
          <option value="">Select an exam period…</option>
          {usablePeriods.map((p) => <option key={p.id} value={p.id}>{p.name} ({EXAM_TYPE_LABELS[p.examType]})</option>)}
        </select>
      </FilterBar>
      {period && (
        matchingOfferings.length === 0 ? (
          <ReadOnlyNote>No courses in this exam period&apos;s term ({period.academicYear}, semester {period.semester}).</ReadOnlyNote>
        ) : (
          // Remount per period: the choices depend on the period's term.
          <OfferingPicker key={period.id} rows={matchingOfferings} value={offeringId} cohorts={cohorts} idPrefix="results"
            onChange={(o) => setOfferingId(o?.id ?? null)} />
        )
      )}
      {isHod && selected && <p className="text-[12px] text-muted">Faculty: <span className="text-fg">{selected.staffName}</span></p>}
      {periodId === null || offeringId === null ? (
        <Card><EmptyBlock icon={<Award className="w-10 h-10" />} title="Choose an exam period, then the cohort, section and subject." hint={isHod ? undefined : 'Only the courses you teach are listed.'} /></Card>
      ) : (
        // Editing is never offered from this screen: STAFF results are read-only (contract §H1), HOD only publishes.
        <ResultSheetEditor key={`${offeringId}-${periodId}`} offeringId={offeringId} periodId={periodId} canEdit={false} canPublish={isHod} />
      )}
    </div>
  );
}

// ---------- HOD: all results ----------

/** HOD: results of one class (Cohort → Semester → Section, optionally one Subject), then exam and status. */
function AllResults() {
  const periods = useAllExamPeriods();
  const offerings = useAllSubjectOfferings();
  const cohorts = useCohortsIn(offerings.data);
  const [ctx, setCtx] = useState<AcademicContext>(EMPTY_CONTEXT);
  const [filters, setFilters] = useState({ examPeriodId: '', published: '' });
  const [page, setPage] = useState(0);
  const set = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); setPage(0); };
  // Cohort-first: nothing loads until the class is chosen. The backend filters by section or by course.
  const prompt = missingContext(ctx, 'section');
  const subjectOfferingId = resolveRow(offerings.data ?? [], ctx)?.id;
  const { data, isLoading, isError, error, isFetching } = useResults({
    page, size: 50,
    examPeriodId: filters.examPeriodId ? Number(filters.examPeriodId) : undefined,
    sectionId: subjectOfferingId === undefined ? ctx.sectionId ?? undefined : undefined,
    subjectOfferingId,
    published: filters.published === '' ? undefined : filters.published === 'true',
  }, prompt === null);

  return (
    <div className="space-y-4">
      <AcademicContextFilter rows={offerings.data ?? []} value={ctx} cohorts={cohorts} idPrefix="all-results"
        disabled={offerings.isLoading} onChange={(next) => { setCtx(next); setPage(0); }} />
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
      {prompt ? <ContextPrompt icon={<Award className="w-10 h-10" />} title={prompt} hint={ctx.batchId === null ? 'Then choose the semester and section to see its results.' : undefined} />
        : isLoading ? <LoadingBlock label="Loading results..." />
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
                      <div className="font-mono text-[11px] text-muted">{r.registerNumber} · Sec {r.sectionName}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap"><span className="font-mono text-xs text-muted mr-1">{r.subjectCode}</span>{r.subjectName}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.examPeriodName}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatMarks(r.marksObtained)} / {formatMarks(r.maxMarks)}</TableCell>
                    <TableCell>{r.grade ?? '—'}</TableCell>
                    <TableCell><StatusBadge info={RESULT_STATUS_BADGE[r.resultStatus]} /></TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge info={PUBLISHED_BADGE(r.published)} />
                      {r.publishedAt && <div className="text-[11px] text-muted">{formatDateTime(r.publishedAt)}</div>}
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
      <Tabs label="Result views" value={tab} onChange={setTab}
        items={[{ value: 'sheet', label: 'Review & Publish' }, { value: 'all', label: 'All Results' }] as const} />
      {tab === 'sheet' ? <SheetSelector isHod /> : <AllResults />}
    </div>
  );
}

function ResultsView() {
  const { hasRole } = useAuth();
  return (
    <PageContainer rawLayout>
      {hasRole('ROLE_HOD') ? <HodResults /> : hasRole('ROLE_STAFF') ? (
        // Staff results are strictly read-only: no result sheet editor is rendered for STAFF.
        <Suspense fallback={<LoadingBlock label="Loading..." />}><StaffResults /></Suspense>
      ) : <StudentResults />}
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
