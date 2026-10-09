'use client';

import { useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, LoadingBlock } from '@/components/gradebook/shared';
import { useMyGrades } from '@/hooks/useGradebook';
import {
  ASSESSMENT_TYPE_LABELS,
  GRADE_STATUS_BADGE,
  SELECT_CLASS,
  SUBJECT_TYPE_LABELS,
  formatDate,
  formatMarks,
} from '@/lib/gradebook-labels';
import { StudentGradeView } from '@/types/gradebook';
import { isGradebookEnabled } from '@/lib/feature-flags';
import { notFound } from 'next/navigation';

// Shows only what GET /grades/me returns (finalized assessments). No overall
// grade, GPA or letter grade is derived here.

/** Per-assessment percentage for a graded result. */
const percentOf = (g: StudentGradeView) =>
  g.marks === null || !g.maxMarks ? null : Math.round((Number(g.marks) / Number(g.maxMarks)) * 1000) / 10;

function GradeCell({ g }: { g: StudentGradeView }) {
  if (g.gradeStatus === 'GRADED') {
    return (
      <span className="font-semibold">
        {formatMarks(g.marks)} <span className="text-[#9A9A9A] font-normal">/ {formatMarks(g.maxMarks)}</span>
      </span>
    );
  }
  const badge = GRADE_STATUS_BADGE[g.gradeStatus];
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

function MyGradesView() {
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');

  // The endpoint returns the full (unpaginated) list, so filter options can be
  // taken from the unfiltered response; filtering itself happens on the server.
  const all = useMyGrades({});
  const { data, isLoading, isError, error, isFetching } = useMyGrades({
    academicYear: academicYear || undefined,
    semester: semester ? Number(semester) : undefined,
  });

  const years = useMemo(() => [...new Set(all.data?.map((g) => g.academicYear))].sort().reverse(), [all.data]);
  const semesters = useMemo(() => [...new Set(all.data?.map((g) => g.semester))].sort((a, b) => a - b), [all.data]);

  const groups = useMemo(() => {
    const map = new Map<number, StudentGradeView[]>();
    data?.forEach((g) => map.set(g.subjectOfferingId, [...(map.get(g.subjectOfferingId) ?? []), g]));
    return [...map.values()].map((rows) =>
      rows.sort((a, b) => a.assessmentDate.localeCompare(b.assessmentDate) || a.assessmentId - b.assessmentId),
    );
  }, [data]);

  const filters = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <select aria-label="Filter by academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={SELECT_CLASS}>
        <option value="">All Academic Years</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select aria-label="Filter by semester" value={semester} onChange={(e) => setSemester(e.target.value)} className={SELECT_CLASS}>
        <option value="">All Semesters</option>
        {semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
      </select>
      {isFetching && !isLoading && <Spinner size="sm" />}
    </div>
  );

  if (isLoading) return <PageContainer><LoadingBlock label="Loading your grades..." /></PageContainer>;
  if (isError || !data) {
    return <PageContainer><ErrorBanner error={error} fallback="Unable to load your grades." title="Error Loading Grades" /></PageContainer>;
  }

  return (
    <PageContainer contextArea={(all.data?.length ?? 0) > 0 ? filters : undefined} rawLayout={true}>
      {groups.length === 0 ? (
        <Card>
          <EmptyBlock
            icon={<GraduationCap className="w-10 h-10" />}
            title="No published grades yet."
            hint="Marks appear here once your teacher finalizes an assessment."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((rows) => {
            const first = rows[0];
            return (
              <Card key={first.subjectOfferingId}>
                <div className="px-6 py-4 border-b border-[#F5F5F5]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-[#111111]">{first.subjectName}</h3>
                    <span className="font-mono text-xs text-[#9A9A9A]">{first.subjectCode}</span>
                    <Badge variant="outline">{SUBJECT_TYPE_LABELS[first.subjectType]}</Badge>
                  </div>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">Semester {first.semester} · {first.academicYear}</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((g) => {
                        const pct = g.gradeStatus === 'GRADED' ? percentOf(g) : null;
                        return (
                          <TableRow key={g.assessmentId}>
                            <TableCell>
                              <div className="font-medium">{g.assessmentTitle}</div>
                              {g.remarks && <div className="text-xs text-[#9A9A9A] mt-0.5">{g.remarks}</div>}
                            </TableCell>
                            <TableCell className="text-[#666666]">{ASSESSMENT_TYPE_LABELS[g.assessmentType]}</TableCell>
                            <TableCell className="text-[#666666] whitespace-nowrap">{formatDate(g.assessmentDate)}</TableCell>
                            <TableCell className="whitespace-nowrap"><GradeCell g={g} /></TableCell>
                            <TableCell className="text-right text-[#666666]">{pct === null ? '—' : `${pct}%`}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

export default function MyGradesPage() {
  // Marking is switched off on the backend; the page is kept for when it returns.
  if (!isGradebookEnabled()) notFound();
  return (
    <RequireRole roles={['ROLE_STUDENT']}>
      <MyGradesView />
    </RequireRole>
  );
}
