'use client';

import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound, useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Lock, Save, Users } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Spinner } from '@/components/ui/Spinner';
import { AssessmentStatusBadge, EmptyBlock, ErrorBanner, LoadingBlock } from '@/components/gradebook/shared';
import { useAuth } from '@/contexts/auth-context';
import { useAssessmentSummary, useFinalizeAssessment, useGradebook, useSaveGrades } from '@/hooks/useGradebook';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  ASSESSMENT_TYPE_LABELS,
  GRADE_STATUS_BADGE,
  classLabel,
  formatDate,
  formatDateTime,
  formatMarks,
} from '@/lib/gradebook-labels';
import { ROUTES } from '@/constants/routes';
import { ApiResponse } from '@/types/api';
import {
  Assessment,
  GradebookRow,
  GradeStatus,
  GradeStatusLabel,
  NOT_GRADED,
  StudentGradeEntry,
} from '@/types/gradebook';
import { isGradebookEnabled } from '@/lib/feature-flags';

interface RowDraft {
  status: GradeStatusLabel;
  marks: string;
  remarks: string;
}

const draftFromRow = (row: GradebookRow): RowDraft => ({
  status: row.gradeStatus,
  marks: row.marks === null ? '' : String(Number(row.marks)),
  remarks: row.remarks ?? '',
});

const sameDraft = (a: RowDraft, b: RowDraft) =>
  a.status === b.status && a.remarks.trim() === b.remarks.trim() &&
  (a.marks === '' ? b.marks === '' : b.marks !== '' && Number(a.marks) === Number(b.marks));

/** Quick checks before sending; the backend re-validates every row. */
const rowProblem = (draft: RowDraft, maxMarks: number): string | null => {
  if (draft.status !== 'GRADED') return null;
  if (draft.marks.trim() === '') return 'Marks are required when status is Graded.';
  const marks = Number(draft.marks);
  if (Number.isNaN(marks)) return 'Marks must be a number.';
  if (marks < 0) return 'Marks cannot be negative.';
  if (marks > maxMarks) return `Marks cannot exceed ${formatMarks(maxMarks)}.`;
  if (!/^\d+(\.\d{1,2})?$/.test(draft.marks.trim())) return 'Use at most 2 decimal places.';
  return null;
};

/**
 * Backend bulk-validation errors look like "grades[3] (studentId 42): marks cannot exceed ...".
 * Map them back to students so the affected rows can be highlighted.
 */
const parseRowErrors = (error: unknown): { message: string; byStudent: Map<number, string>; other: string[] } => {
  const byStudent = new Map<number, string>();
  const other: string[] = [];
  let message = '';
  if (axios.isAxiosError<ApiResponse>(error)) {
    message = error.response?.data?.message ?? '';
    for (const line of error.response?.data?.errors ?? []) {
      const match = line.match(/\(studentId (\d+)\):\s*(.*)$/);
      if (match) byStudent.set(Number(match[1]), match[2]);
      else other.push(line);
    }
  }
  return { message, byStudent, other };
};

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="p-4 bg-white border border-[#E8E8E8] rounded-[10px]">
      <p className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-[#111111] mt-1">{value}</p>
      {hint && <p className="text-[11px] text-[#9A9A9A] mt-0.5">{hint}</p>}
    </div>
  );
}

/** Backend analytics, shown as returned — nothing is recalculated here. */
function SummaryCards({ assessmentId }: { assessmentId: number }) {
  const { data, isLoading, isError, error } = useAssessmentSummary(assessmentId);
  if (isLoading) return <div className="py-6 flex justify-center"><Spinner /></div>;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load the assessment summary." />;

  const hasPassMarks = data.passMarks !== null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatTile label="Expected" value={data.expectedStudentCount} />
        <StatTile label="Graded" value={data.gradedCount} />
        <StatTile label="Absent" value={data.absentCount} />
        <StatTile label="Exempted" value={data.exemptedCount} />
        <StatTile label="Not Graded" value={data.notGradedCount} />
        <StatTile label="Average" value={formatMarks(data.average)} hint={`of ${formatMarks(data.maxMarks)}`} />
        <StatTile label="Highest" value={formatMarks(data.highest)} />
        <StatTile label="Lowest" value={formatMarks(data.lowest)} />
      </div>
      {hasPassMarks && (
        <div className="grid grid-cols-3 gap-3 max-w-xl">
          <StatTile label="Passed" value={data.passCount ?? '—'} hint={`Pass mark ${formatMarks(data.passMarks)}`} />
          <StatTile label="Failed" value={data.failCount ?? '—'} />
          <StatTile label="Pass %" value={data.passPercentage === null ? '—' : `${formatMarks(data.passPercentage)}%`} />
        </div>
      )}
    </div>
  );
}

function AssessmentHeader({ assessment }: { assessment: Assessment }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-[#111111]">{assessment.title}</h2>
              <AssessmentStatusBadge status={assessment.status} />
              <Badge variant="outline">{ASSESSMENT_TYPE_LABELS[assessment.assessmentType]}</Badge>
            </div>
            <p className="text-sm text-[#666666] mt-1">
              {assessment.subjectName} <span className="font-mono text-xs">({assessment.subjectCode})</span> · {classLabel(assessment)} ·
              Sem {assessment.semester} · {assessment.academicYear}
            </p>
            <p className="text-xs text-[#9A9A9A] mt-1">Staff: {assessment.staffName}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
            <div><p className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Date</p>{formatDate(assessment.assessmentDate)}</div>
            <div><p className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Max Marks</p>{formatMarks(assessment.maxMarks)}</div>
            <div><p className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Pass Marks</p>{formatMarks(assessment.passMarks)}</div>
            <div><p className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Weightage</p>{assessment.weightage === null ? '—' : `${formatMarks(assessment.weightage)}%`}</div>
          </div>
        </div>
        {assessment.finalizedAt && (
          <p className="text-xs text-[#9A9A9A] mt-3">Finalized {formatDateTime(assessment.finalizedAt)}</p>
        )}
      </CardContent>
    </Card>
  );
}

function GradeEntryView() {
  const params = useParams<{ id: string }>();
  const assessmentId = Number(params.id);
  const validId = Number.isInteger(assessmentId) && assessmentId > 0;
  const router = useRouter();
  const { user, hasRole } = useAuth();

  const { data, isLoading, isError, error } = useGradebook(validId ? assessmentId : null);
  const saveGrades = useSaveGrades();
  const finalize = useFinalizeAssessment();

  // Only rows the user has touched; everything else shows the saved value.
  const [edits, setEdits] = useState<Record<number, RowDraft>>({});
  const [savedMessage, setSavedMessage] = useState('');

  const assessment = data?.assessment;
  const isOwner = !!assessment && hasRole('ROLE_STAFF') && assessment.staffId === user?.id;
  const editable = isOwner && assessment?.status === 'DRAFT';
  const maxMarks = assessment ? Number(assessment.maxMarks) : 0;

  const originals = useMemo(() => {
    const map = new Map<number, RowDraft>();
    data?.students.forEach((row) => map.set(row.studentId, draftFromRow(row)));
    return map;
  }, [data]);

  const changedIds = useMemo(
    () => Object.keys(edits).map(Number).filter((id) => {
      const original = originals.get(id);
      return original && !sameDraft(original, edits[id]);
    }),
    [edits, originals],
  );
  const dirty = changedIds.length > 0;

  const localProblems = useMemo(() => {
    const map = new Map<number, string>();
    changedIds.forEach((id) => {
      const problem = rowProblem(edits[id], maxMarks);
      if (problem) map.set(id, problem);
    });
    return map;
  }, [changedIds, edits, maxMarks]);

  const serverErrors = useMemo(() => parseRowErrors(saveGrades.error), [saveGrades.error]);

  // Warn before closing or reloading the tab with unsaved marks.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const draftFor = (row: GradebookRow) => edits[row.studentId] ?? originals.get(row.studentId)!;

  const updateRow = (row: GradebookRow, patch: Partial<RowDraft>) => {
    setSavedMessage('');
    setEdits((old) => {
      const next = { ...(old[row.studentId] ?? originals.get(row.studentId)!), ...patch };
      // Absent / Exempted rows carry no marks.
      if (next.status === 'ABSENT' || next.status === 'EXEMPTED') next.marks = '';
      // Typing marks for an ungraded student means they are graded.
      if (next.status === NOT_GRADED && next.marks !== '') next.status = 'GRADED';
      return { ...old, [row.studentId]: next };
    });
  };

  const onSave = () => {
    if (!assessment || localProblems.size > 0) return;
    const grades: StudentGradeEntry[] = changedIds
      .map((id) => ({ id, draft: edits[id] }))
      .filter(({ draft }) => draft.status !== NOT_GRADED) // display-only value, never sent
      .map(({ id, draft }) => ({
        studentId: id,
        status: draft.status as GradeStatus,
        marks: draft.status === 'GRADED' ? Number(draft.marks) : null,
        remarks: draft.remarks.trim() || null,
      }));
    if (grades.length === 0) {
      setEdits({});
      return;
    }
    saveGrades.mutate(
      { assessmentId: assessment.id, payload: { grades } },
      {
        onSuccess: (result) => {
          setEdits({});
          setSavedMessage(`Saved — ${result.createdCount} added, ${result.updatedCount} updated.`);
        },
      },
    );
  };

  const onDiscard = () => {
    if (window.confirm('Discard all unsaved changes?')) {
      setEdits({});
      saveGrades.reset();
    }
  };

  const onBack = () => {
    if (dirty && !window.confirm('You have unsaved marks. Leave without saving?')) return;
    router.push(ROUTES.ASSESSMENTS);
  };

  const onFinalize = () => {
    if (!assessment) return;
    const message =
      `Finalize "${assessment.title}"?\n\n` +
      'Marks will be published to students and the assessment will be locked. ' +
      'Finalized assessments cannot currently be edited or reopened.';
    if (window.confirm(message)) {
      setSavedMessage('');
      finalize.mutate(assessment.id);
    }
  };

  // Enter moves to the next student's marks field, like a spreadsheet.
  const onMarksKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const next = document.querySelector<HTMLInputElement>(`[data-marks-index="${index + 1}"]`);
    next?.focus();
    next?.select();
  };

  if (!validId) {
    return <PageContainer><ErrorBanner error={null} fallback="Invalid assessment link." /></PageContainer>;
  }
  if (isLoading) {
    return <PageContainer><LoadingBlock label="Loading gradebook..." /></PageContainer>;
  }
  if (isError || !data || !assessment) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Link href={ROUTES.ASSESSMENTS} className="inline-flex items-center text-sm text-[#666666] hover:text-[#111111]">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to assessments
          </Link>
          <ErrorBanner error={error} fallback="Unable to load this assessment." title="Error Loading Gradebook" />
        </div>
      </PageContainer>
    );
  }

  const readOnlyReason =
    assessment.status === 'FINALIZED'
      ? 'This assessment is finalized. Marks are published and locked.'
      : hasRole('ROLE_HOD')
        ? 'Read-only view. Only the assigned staff member can enter marks or finalize this assessment.'
        : !isOwner
          ? 'Read-only view. This assessment belongs to another staff member.'
          : null;

  const errorCount = localProblems.size + serverErrors.byStudent.size;

  return (
    <PageContainer rawLayout={true}>
      <div className="space-y-6">
        <button onClick={onBack} className="inline-flex items-center text-sm text-[#666666] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to assessments
        </button>

        <AssessmentHeader assessment={assessment} />

        {readOnlyReason && (
          <div className="flex items-center gap-2 rounded-[10px] bg-[#F5F5F5] border border-[#E8E8E8] p-3 text-sm text-[#666666]">
            <Lock className="w-4 h-4 flex-shrink-0" /> {readOnlyReason}
          </div>
        )}

        <section aria-label="Assessment summary">
          <h3 className="text-sm font-semibold text-[#111111] mb-3">Summary</h3>
          <SummaryCards assessmentId={assessment.id} />
        </section>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">Marks</CardTitle>
              <p className="text-xs text-[#9A9A9A] mt-1">{data.expectedStudentCount} students in this class</p>
            </div>
            {editable && (
              <div className="flex items-center gap-2 flex-wrap">
                {dirty && (
                  <Badge variant="warning">{changedIds.length} unsaved change{changedIds.length === 1 ? '' : 's'}</Badge>
                )}
                {dirty && (
                  <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saveGrades.isPending}>Discard</Button>
                )}
                <Button size="sm" onClick={onSave} isLoading={saveGrades.isPending} disabled={!dirty || localProblems.size > 0}>
                  {!saveGrades.isPending && <Save className="w-3.5 h-3.5 mr-1.5" />} Save Marks
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onFinalize}
                  isLoading={finalize.isPending}
                  disabled={dirty || saveGrades.isPending}
                  title={dirty ? 'Save or discard your changes before finalizing' : undefined}
                >
                  {!finalize.isPending && <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />} Finalize Assessment
                </Button>
              </div>
            )}
          </CardHeader>

          {(savedMessage || saveGrades.isError || finalize.isError || (editable && dirty && localProblems.size > 0) || finalize.isSuccess) && (
            <div className="px-6 pt-4 space-y-2">
              {savedMessage && <p className="text-sm text-green-700" role="status">{savedMessage}</p>}
              {finalize.isSuccess && (
                <p className="text-sm text-green-700" role="status">Assessment finalized. Students have been notified by the system.</p>
              )}
              {editable && localProblems.size > 0 && (
                <p className="text-sm text-red-600" role="alert">
                  Fix {localProblems.size} highlighted row{localProblems.size === 1 ? '' : 's'} before saving.
                </p>
              )}
              {saveGrades.isError && (
                <div className="rounded-[10px] bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
                  {serverErrors.byStudent.size > 0 || serverErrors.other.length > 0 ? (
                    <>
                      <p className="font-medium">{serverErrors.message}</p>
                      {serverErrors.byStudent.size > 0 && (
                        <p className="mt-1">
                          {serverErrors.byStudent.size} row{serverErrors.byStudent.size === 1 ? '' : 's'} rejected — see the
                          highlighted students. Nothing was saved.
                        </p>
                      )}
                      {serverErrors.other.map((line) => <p key={line} className="mt-1">{line}</p>)}
                    </>
                  ) : (
                    <p>{getApiErrorMessage(saveGrades.error, 'Unable to save marks.')}</p>
                  )}
                </div>
              )}
              {finalize.isError && (
                <div className="rounded-[10px] bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
                  {getApiErrorMessage(finalize.error, 'Unable to finalize assessment.')}
                </div>
              )}
            </div>
          )}

          <CardContent className="p-0 pt-2">
            {data.students.length === 0 ? (
              <EmptyBlock icon={<Users className="w-10 h-10" />} title="No active students in this class." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="whitespace-nowrap">Register No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="w-44">Status</TableHead>
                      <TableHead className="w-36">Marks / {formatMarks(maxMarks)}</TableHead>
                      <TableHead className="min-w-48">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.students.map((row, index) => {
                      const draft = draftFor(row);
                      const changed = changedIds.includes(row.studentId);
                      const problem = (changed ? localProblems.get(row.studentId) : undefined) ?? serverErrors.byStudent.get(row.studentId);
                      const badge = GRADE_STATUS_BADGE[draft.status];
                      return (
                        <TableRow
                          key={row.studentId}
                          className={problem ? 'bg-red-50/60' : changed ? 'bg-[#FFFBEB]' : ''}
                        >
                          <TableCell className="text-[#9A9A9A] text-xs">{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{row.registerNumber}</TableCell>
                          <TableCell>
                            <div className="font-medium whitespace-nowrap">{row.name}</div>
                            {problem && <div className="text-xs text-red-600 mt-0.5">{problem}</div>}
                          </TableCell>
                          <TableCell>
                            {editable ? (
                              <select
                                aria-label={`Status for ${row.name}`}
                                value={draft.status}
                                onChange={(e) => updateRow(row, { status: e.target.value as GradeStatusLabel })}
                                className="h-9 w-full px-2 text-sm border border-[#E8E8E8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#111111]"
                              >
                                {draft.status === NOT_GRADED && <option value={NOT_GRADED} disabled>Not graded</option>}
                                <option value="GRADED">Graded</option>
                                <option value="ABSENT">Absent</option>
                                <option value="EXEMPTED">Exempted</option>
                              </select>
                            ) : (
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editable ? (
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={maxMarks}
                                step={0.01}
                                aria-label={`Marks for ${row.name}`}
                                data-marks-index={index}
                                value={draft.marks}
                                disabled={draft.status === 'ABSENT' || draft.status === 'EXEMPTED'}
                                placeholder={draft.status === 'ABSENT' || draft.status === 'EXEMPTED' ? '—' : ''}
                                onChange={(e) => updateRow(row, { marks: e.target.value })}
                                onKeyDown={(e) => onMarksKeyDown(e, index)}
                                className={`h-9 w-24 px-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-1 disabled:bg-[#F5F5F5] disabled:text-[#9A9A9A] disabled:cursor-not-allowed ${
                                  problem ? 'border-red-400 focus:ring-red-500' : 'border-[#E8E8E8] focus:ring-[#111111]'
                                }`}
                              />
                            ) : (
                              <span className="font-medium">{draft.status === 'GRADED' ? formatMarks(row.marks) : '—'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editable ? (
                              <input
                                type="text"
                                maxLength={255}
                                aria-label={`Remarks for ${row.name}`}
                                value={draft.remarks}
                                onChange={(e) => updateRow(row, { remarks: e.target.value })}
                                className="h-9 w-full min-w-40 px-2 text-sm border border-[#E8E8E8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#111111]"
                              />
                            ) : (
                              <span className="text-[#666666] text-sm">{row.remarks || '—'}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {editable && errorCount === 0 && (
            <p className="px-6 py-3 text-xs text-[#9A9A9A] border-t border-[#F5F5F5]">
              Tip: press Enter in a marks field to move to the next student. Only changed rows are sent when you save.
            </p>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

export default function AssessmentGradesPage() {
  // Marking is switched off on the backend; the page is kept for when it returns.
  if (!isGradebookEnabled()) notFound();
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF']}>
      <GradeEntryView />
    </RequireRole>
  );
}
