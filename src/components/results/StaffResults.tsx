'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { Award } from '@/components/ui/icons';
import { EmptyBlock, ErrorBanner, LoadingBlock } from '@/components/gradebook/shared';
import { StatusChip, longDate } from '@/components/gradebook/assessment-ui';
import { ReadOnlyNote, StatusBadge } from '@/components/erp/shared';
import { TeachingSelector } from '@/components/academic/TeachingSelector';
import { useTeachingSelection } from '@/hooks/useTeachingSelection';
import { useAllAssessments } from '@/hooks/useGradebook';
import { useAllExamPeriods } from '@/hooks/useExams';
import { QUERY_KEYS } from '@/constants/query-keys';
import { ROUTES } from '@/constants/routes';
import { fetchAllPages } from '@/lib/pagination';
import { currentQuery, replaceQuery } from '@/lib/url-query';
import { resultService } from '@/services/api/result.service';
import { gradebookService } from '@/services/api/gradebook.service';
import { formatMarks, SELECT_CLASS } from '@/lib/gradebook-labels';
import { RESULT_STATUS_BADGE } from '@/lib/erp-labels';
import { batchLabel, classOptions, classOptionLabel, classesIn } from '@/lib/teaching-context';
import { Assessment, GradebookRow, SubjectOffering } from '@/types/gradebook';
import { ExamPeriod } from '@/types/exam';
import { ExamResult } from '@/types/result';

/** Exam choices use the backend's own identifiers: the exam type END_SEMESTER and the assessment types CAT_1 / CAT_2. */
type ExamChoice = 'END_SEMESTER' | 'CAT_1' | 'CAT_2';
const EXAMS: { value: ExamChoice; label: string }[] = [
  { value: 'END_SEMESTER', label: 'End Semester Examination' },
  { value: 'CAT_1', label: 'CAT 1' },
  { value: 'CAT_2', label: 'CAT 2' },
];
const isExam = (v: string | null): v is ExamChoice => EXAMS.some((e) => e.value === v);

const NO_POLLING = { refetchInterval: false } as const;

function ClassCard({ offering, subtitle, children }: { offering: SubjectOffering; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel" aria-label={classOptionLabel(offering)}>
      <div className="panel-header !items-start">
        <div className="min-w-0">
          <h2 className="!text-[15px]">{offering.subjectName}</h2>
          <p className="font-mono !text-[11px] !mt-1">{offering.subjectCode} · {batchLabel(offering.batchName)} · Sec {offering.sectionName} · Sem {offering.semester}</p>
        </div>
        {subtitle && <div className="text-[12px] text-muted text-right">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

// ---------- End semester (published results only, read-only) ----------

function EndSemesterResults({ classes, periods }: { classes: SubjectOffering[]; periods: ExamPeriod[] }) {
  // One request per class × matching exam period (same academic year and semester as the class).
  const pairs = useMemo(
    () => classes.flatMap((o) => periods.filter((p) => p.academicYear === o.academicYear && p.semester === o.semester).map((p) => ({ o, p }))),
    [classes, periods],
  );
  const queries = useQueries({
    queries: pairs.map(({ o, p }) => ({
      queryKey: [QUERY_KEYS.RESULTS, 'staff-view', o.id, p.id],
      queryFn: () => fetchAllPages((page, size) => resultService.getResults({ page, size, examPeriodId: p.id, subjectOfferingId: o.id, published: true })),
      ...NO_POLLING,
    })),
  });

  return (
    <div className="space-y-4">
      {classes.map((o) => {
        const mine = pairs.map((pair, i) => ({ ...pair, q: queries[i] })).filter((x) => x.o.id === o.id);
        if (mine.length === 0) {
          return (
            <ClassCard key={o.id} offering={o}>
              <p className="px-[21px] pb-5 text-[12.5px] text-muted">No end-semester examination is set up for Semester {o.semester} ({o.academicYear}).</p>
            </ClassCard>
          );
        }
        return mine.map(({ p, q }) => {
          const rows: ExamResult[] = q.data ?? [];
          return (
            <ClassCard key={`${o.id}-${p.id}`} offering={o} subtitle={p.name}>
              {q.isLoading ? <LoadingBlock label="Loading results..." />
                : q.isError ? <div className="px-[21px] pb-5"><ErrorBanner error={q.error} fallback="Unable to load results." /></div>
                  : rows.length === 0 ? (
                    <p className="px-[21px] pb-5 text-[12.5px] text-muted">Results for {p.name} have not been published for this class yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="f-table">
                        <thead><tr><th>Register No.</th><th>Student</th><th>Subject</th><th>Marks</th><th>Grade</th><th>Result</th></tr></thead>
                        <tbody>
                          {[...rows].sort((a, b) => a.registerNumber.localeCompare(b.registerNumber)).map((r) => (
                            <tr key={r.id}>
                              <td className="font-mono text-[11px]">{r.registerNumber}</td>
                              <td className="font-[550]">{r.studentName}</td>
                              <td><span className="font-mono text-[11px] text-muted">{r.subjectCode}</span> · Sec {r.sectionName}</td>
                              <td>{r.marksObtained === null ? '—' : `${formatMarks(r.marksObtained)} / ${formatMarks(r.maxMarks)}`}</td>
                              <td>{r.grade ?? '—'}</td>
                              <td><StatusBadge info={RESULT_STATUS_BADGE[r.resultStatus]} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
            </ClassCard>
          );
        });
      })}
    </div>
  );
}

// ---------- CAT 1 / CAT 2 (finalized gradebook marks only) ----------

const catResult = (row: GradebookRow, a: Assessment) => {
  if (row.gradeStatus === 'ABSENT') return { label: 'Absent', variant: 'warning' as const };
  if (row.gradeStatus === 'EXEMPTED') return { label: 'Exempted', variant: 'info' as const };
  if (row.gradeStatus !== 'GRADED' || row.marks === null) return { label: 'Not graded', variant: 'default' as const };
  if (a.passMarks === null) return { label: 'Graded', variant: 'default' as const };
  return Number(row.marks) >= Number(a.passMarks) ? { label: 'Pass', variant: 'success' as const } : { label: 'Fail', variant: 'error' as const };
};

function CatResults({ classes, exam, assessments }: { classes: SubjectOffering[]; exam: 'CAT_1' | 'CAT_2'; assessments: Assessment[] }) {
  const label = exam === 'CAT_1' ? 'CAT 1' : 'CAT 2';
  const relevant = assessments.filter((a) => a.assessmentType === exam && classes.some((o) => o.id === a.subjectOfferingId));
  const finalized = relevant.filter((a) => a.status === 'FINALIZED');
  const books = useQueries({
    queries: finalized.map((a) => ({
      queryKey: [QUERY_KEYS.ASSESSMENT_GRADES, a.id],
      queryFn: () => gradebookService.getGradebook(a.id),
      ...NO_POLLING,
    })),
  });

  return (
    <div className="space-y-4">
      {classes.map((o) => {
        const forClass = relevant.filter((a) => a.subjectOfferingId === o.id);
        if (forClass.length === 0) {
          return (
            <ClassCard key={o.id} offering={o}>
              <p className="px-[21px] pb-5 text-[12.5px] text-muted">No {label} assessment for this class yet. {label} marks are entered in Assessments.</p>
            </ClassCard>
          );
        }
        return forClass.map((a) => {
          if (a.status !== 'FINALIZED') {
            return (
              <ClassCard key={a.id} offering={o} subtitle={<StatusChip assessment={a} />}>
                <p className="px-[21px] pb-5 text-[12.5px] text-muted">
                  <strong className="text-fg font-[550]">{a.title}</strong> is still a draft, so its marks are not results yet and are not shown here.{' '}
                  <Link href={`${ROUTES.ASSESSMENTS}/${a.id}`} className="text-accent underline underline-offset-2">Enter or finalize marks in Assessments</Link>
                </p>
              </ClassCard>
            );
          }
          const q = books[finalized.indexOf(a)];
          return (
            <ClassCard key={a.id} offering={o}
              subtitle={<>{a.title} · held {longDate(a.assessmentDate)} · Max {formatMarks(a.maxMarks)}{a.finalizedAt ? ` · finalized ${longDate(a.finalizedAt)}` : ''}</>}>
              {q?.isLoading ? <LoadingBlock label="Loading marks..." />
                : q?.isError || !q?.data ? <div className="px-[21px] pb-5"><ErrorBanner error={q?.error} fallback="Unable to load marks." /></div>
                  : (
                    <div className="overflow-x-auto">
                      <table className="f-table">
                        <thead><tr><th>Register No.</th><th>Student</th><th>Subject</th><th>Marks</th><th>Result</th></tr></thead>
                        <tbody>
                          {q.data.students.map((r) => (
                            <tr key={r.studentId}>
                              <td className="font-mono text-[11px]">{r.registerNumber}</td>
                              <td className="font-[550]">{r.name}</td>
                              <td><span className="font-mono text-[11px] text-muted">{a.subjectCode}</span> · Sec {a.sectionName}</td>
                              <td>{r.gradeStatus === 'GRADED' && r.marks !== null ? `${formatMarks(r.marks)} / ${formatMarks(a.maxMarks)}` : '—'}</td>
                              <td><StatusBadge info={catResult(r, a)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
            </ClassCard>
          );
        });
      })}
    </div>
  );
}

/**
 * STAFF → Results: Batch → Semester → Exam (contract §H). Strictly read-only — there are no controls that
 * change results here; the backend also refuses STAFF writes.
 */
export function StaffResults() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { rows, batches, selection, setSelection, isLoading, isError, error } = useTeachingSelection();
  const periods = useAllExamPeriods();
  const assessments = useAllAssessments();

  const examParam = searchParams.get('exam');
  const exam: ExamChoice = isExam(examParam) ? examParam : 'END_SEMESTER';
  const setExam = (value: ExamChoice) => {
    const params = currentQuery(pathname);
    params.set('exam', value);
    replaceQuery(router, pathname, params);
  };

  const periodClasses = useMemo(() => classesIn(rows, selection), [rows, selection]);
  const classList = useMemo(() => classOptions(periodClasses), [periodClasses]);
  const shown = selection.offeringId === null ? periodClasses : periodClasses.filter((o) => o.id === selection.offeringId);
  const endSemPeriods = useMemo(
    () => (periods.data ?? []).filter((p) => p.examType === 'END_SEMESTER' && p.semester === selection.semester),
    [periods.data, selection.semester],
  );

  const ready = selection.batchId !== null && selection.semester !== null;

  let body;
  if (isLoading) body = <LoadingBlock label="Loading your classes..." />;
  else if (isError) body = <ErrorBanner error={error} fallback="Unable to load your classes." />;
  else if (rows.length === 0) body = <div className="panel"><EmptyBlock icon={<Award className="w-10 h-10" />} title="No classes are assigned to you." /></div>;
  else if (shown.length === 0) body = <div className="panel"><EmptyBlock icon={<Award className="w-10 h-10" />} title="You have no classes in this semester." hint="Choose another batch or semester." /></div>;
  else if (exam === 'END_SEMESTER') {
    body = periods.isLoading ? <LoadingBlock label="Loading exams..." />
      : periods.isError ? <ErrorBanner error={periods.error} fallback="Unable to load exam periods." />
        : <EndSemesterResults classes={shown} periods={endSemPeriods} />;
  } else {
    body = assessments.isLoading ? <LoadingBlock label="Loading assessments..." />
      : assessments.isError ? <ErrorBanner error={assessments.error} fallback="Unable to load assessments." />
        : <CatResults classes={shown} exam={exam} assessments={assessments.data ?? []} />;
  }

  return (
    <div className="space-y-4">
      <TeachingSelector rows={rows} batches={batches} value={selection} onChange={setSelection} classMode="none" idPrefix="results" disabled={isLoading}>
        <select aria-label="Exam" className={`${SELECT_CLASS} max-sm:w-full`} value={exam} disabled={!ready}
          onChange={(e) => setExam(e.target.value as ExamChoice)}>
          {EXAMS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        {periodClasses.length > 1 && (
          <select aria-label="Class" className={`${SELECT_CLASS} max-sm:w-full`} value={selection.offeringId ?? ''}
            onChange={(e) => setSelection({ ...selection, offeringId: Number(e.target.value) || null })}>
            <option value="">All my classes ({classList.length})</option>
            {classList.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
      </TeachingSelector>
      <ReadOnlyNote>
        {exam === 'END_SEMESTER'
          ? 'View only. Staff cannot change end-semester results; only published results are shown.'
          : 'View only. Only finalized marks are shown. CAT marks are entered and finalized in Assessments.'}
      </ReadOnlyNote>
      {body}
    </div>
  );
}
