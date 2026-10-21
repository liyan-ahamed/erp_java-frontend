'use client';

import { ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import { BookOpen, Layers, Pencil, Plus } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import {
  ActiveBadge,
  AssessmentStatusBadge,
  DetailField,
  EmptyBlock,
  ErrorBanner,
  FieldLabel,
  LoadingBlock,
  SidePanel,
} from '@/components/gradebook/shared';
import { ReadOnlyNote, StatTile } from '@/components/erp/shared';
import { AcademicContextFilter } from '@/components/academic/AcademicContextFilter';
import { TeachingSelector } from '@/components/academic/TeachingSelector';
import { useTeachingSelection } from '@/hooks/useTeachingSelection';
import { classOptionLabel, classesIn } from '@/lib/teaching-context';
import { CourseAssignForm } from '@/components/courses/CourseAssignForm';
import { useBatches } from '@/hooks/useAcademic';
import { useAllSubjectOfferings, useAssessments, useSubjectOffering } from '@/hooks/useGradebook';
import { QUERY_KEYS } from '@/constants/query-keys';
import { ROUTES } from '@/constants/routes';
import { getApiErrorMessage } from '@/lib/api-error';
import { isGradebookEnabled } from '@/lib/feature-flags';
import { ASSESSMENT_TYPE_LABELS, SELECT_CLASS, SUBJECT_TYPE_LABELS, SUBJECT_TYPES, formatCredits, formatDate, hasCredits, subjectTypeLabel } from '@/lib/gradebook-labels';
import { AcademicContext, EMPTY_CONTEXT, matchesContext } from '@/lib/academic-context';
import { enrollmentService } from '@/services/api/enrollment.service';
import { assessmentService } from '@/services/api/assessment.service';
import { attendanceService } from '@/services/api/attendance.service';
import { SubjectOffering, SubjectType } from '@/types/gradebook';

type Panel = { mode: 'detail'; id: number } | { mode: 'assign' } | { mode: 'edit'; offering: SubjectOffering } | null;

const sectionList = (rows: SubjectOffering[]) =>
  [...new Set(rows.map((o) => o.sectionName))].sort().join(', ');

// ---------- Offering detail (one class course) ----------

function OfferingDetail({ id, canManage, onEdit }: { id: number; canManage: boolean; onEdit: (o: SubjectOffering) => void }) {
  const { data: offering, isLoading, isError, error } = useSubjectOffering(id);
  const gradebookEnabled = isGradebookEnabled();
  const assessments = useAssessments({ page: 0, size: 50, subjectOfferingId: id }, gradebookEnabled);

  if (isLoading) return <div className="py-10 flex justify-center"><Spinner size="lg" /></div>;
  if (isError || !offering) {
    return <p className="text-sm text-danger">{getApiErrorMessage(error, 'Unable to load this course.')}</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-base font-[550] text-fg">{offering.subjectName}</h4>
        <p className="text-sm text-muted font-mono">{offering.subjectCode}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <ActiveBadge active={offering.active} />
          <Badge variant="outline">{subjectTypeLabel(offering.subjectType)}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Cohort" value={offering.batchName} />
        <DetailField label="Section" value={offering.sectionName} />
        <DetailField label="Semester" value={`Semester ${offering.semester}`} />
        <DetailField label="Academic Year" value={offering.academicYear} />
        <div className="col-span-2">
          <DetailField label="Faculty" value={offering.staffName} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => onEdit(offering)}>
            <Pencil className="w-3.5 h-3.5" /> Edit Assignment
          </Button>
        )}
        {gradebookEnabled && (
          <Link href={`${ROUTES.INTERNAL_MARKS}?offering=${offering.id}`}>
            <Button size="sm" variant="outline">Internal Marks</Button>
          </Link>
        )}
      </div>

      {gradebookEnabled && (
        <div className="pt-4 border-t border-line">
          <FieldLabel>Assessments</FieldLabel>
          {assessments.isLoading ? (
            <div className="py-4 flex justify-center"><Spinner /></div>
          ) : assessments.isError ? (
            <p className="text-sm text-danger mt-2">{getApiErrorMessage(assessments.error, 'Unable to load assessments.')}</p>
          ) : assessments.data?.content.length === 0 ? (
            <p className="text-sm text-muted mt-2">No assessments created yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {assessments.data?.content.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`${ROUTES.ASSESSMENTS}/${a.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-soft rounded-lg px-2 -mx-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{a.title}</p>
                      <p className="text-xs text-muted">{ASSESSMENT_TYPE_LABELS[a.assessmentType]} · {formatDate(a.assessmentDate)}</p>
                    </div>
                    <AssessmentStatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(assessments.data?.totalElements ?? 0) > (assessments.data?.content.length ?? 0) && (
            <Link href={ROUTES.ASSESSMENTS} className="text-xs text-accent hover:underline">
              View all {assessments.data?.totalElements} assessments
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Case C: one subject across its classes ----------

/**
 * Statistics come straight from existing endpoints, one call per class course:
 * the roster (enrolled count), the assessment list (count) and the attendance class summary.
 */
function CourseDetail({ rows, onOpen }: { rows: SubjectOffering[]; onOpen: (id: number) => void }) {
  const gradebook = isGradebookEnabled();
  const rosters = useQueries({
    queries: rows.map((o) => ({
      queryKey: [QUERY_KEYS.ENROLLMENT_ROSTER, o.id],
      queryFn: () => enrollmentService.getRoster(o.id),
      refetchInterval: false as const,
    })),
  });
  const assessments = useQueries({
    queries: rows.map((o) => ({
      queryKey: [QUERY_KEYS.ASSESSMENTS, { page: 0, size: 1, subjectOfferingId: o.id }],
      queryFn: () => assessmentService.getAssessments({ page: 0, size: 1, subjectOfferingId: o.id }),
      enabled: gradebook,
      refetchInterval: false as const,
      retry: false,
    })),
  });
  const attendance = useQueries({
    queries: rows.map((o) => ({
      queryKey: [QUERY_KEYS.ATTENDANCE_SUMMARY, o.id],
      queryFn: () => attendanceService.getClassSummary(o.id),
      refetchInterval: false as const,
      retry: false,
    })),
  });

  const subject = rows[0];
  const enrolledOf = (i: number) => rosters[i].data?.filter((e) => e.status === 'ENROLLED').length;
  const allRostersLoaded = rosters.every((r) => r.isSuccess);
  const totalEnrolled = allRostersLoaded ? rows.reduce((sum, _o, i) => sum + (enrolledOf(i) ?? 0), 0) : null;
  const allAssessmentsLoaded = gradebook && assessments.every((a) => a.isSuccess);
  const totalAssessments = allAssessmentsLoaded ? assessments.reduce((sum, a) => sum + (a.data?.totalElements ?? 0), 0) : null;
  const faculty = [...new Set(rows.map((o) => o.staffName))];

  const cell = (state: { isLoading: boolean; isError: boolean }, value: ReactNode) =>
    state.isLoading ? <Spinner size="sm" /> : state.isError ? <span className="text-muted" title="Not available">—</span> : value;

  return (
    <div className="space-y-4">
      <Card>
        <div className="px-6 py-4 flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-[550] text-fg">{subject.subjectName}</h3>
          <span className="font-mono text-xs text-muted">{subject.subjectCode}</span>
          <Badge variant="outline">{subjectTypeLabel(subject.subjectType)}</Badge>
          {subject.credits !== undefined && <span className="text-xs text-muted">Credits {formatCredits(subject.credits)}</span>}
          <span className="text-xs text-muted">Cohort {subject.batchName} · Semester {subject.semester}</span>
        </div>
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Sections" value={rows.length} hint={sectionList(rows)} />
        <StatTile label="Faculty" value={faculty.length} hint={faculty.join(', ')} />
        <StatTile label="Enrolled" value={totalEnrolled ?? '—'} hint="Students currently enrolled" />
        {gradebook && <StatTile label="Assessments" value={totalAssessments ?? '—'} hint="Across all sections" />}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="col-fit">Section</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead className="col-fit">Academic Year</TableHead>
              <TableHead className="col-fit">Enrolled</TableHead>
              {gradebook && <TableHead className="col-fit">Assessments</TableHead>}
              <TableHead className="col-fit">Sessions Held</TableHead>
              <TableHead className="col-fit">Below Attendance Minimum</TableHead>
              <TableHead className="col-fit">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o, i) => (
              <TableRow key={o.id} className="cursor-pointer" onClick={() => onOpen(o.id)}>
                <TableCell className="font-medium">Section {o.sectionName}</TableCell>
                <TableCell className="text-muted">{o.staffName}</TableCell>
                <TableCell className="text-muted">{o.academicYear}</TableCell>
                <TableCell>{cell(rosters[i], enrolledOf(i))}</TableCell>
                {gradebook && <TableCell>{cell(assessments[i], assessments[i].data?.totalElements)}</TableCell>}
                <TableCell>{cell(attendance[i], attendance[i].data?.finalizedSessions)}</TableCell>
                <TableCell>{cell(attendance[i], attendance[i].data?.studentsBelowThreshold)}</TableCell>
                <TableCell><ActiveBadge active={o.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="text-[11px] text-muted">
        Sessions held counts finalized attendance sessions. Result summaries appear on the Results page per exam period.
      </p>
    </div>
  );
}

// ---------- Class Courses tab ----------

/** STAFF → My Courses: Batch → Semester → Class over their own classes, current semester first. */
function StaffClassCourses() {
  const { rows: all, batches, selection, setSelection, isLoading, isError, error } = useTeachingSelection();
  const [panel, setPanel] = useState<Panel>(null);
  const inPeriod = classesIn(all, selection);
  const rows = selection.offeringId === null ? inPeriod : inPeriod.filter((o) => o.id === selection.offeringId);
  const withCredits = hasCredits(all);

  let body;
  if (isLoading) body = <LoadingBlock label="Loading courses..." />;
  else if (isError) body = <ErrorBanner error={error} fallback="Unable to load courses." title="Error Loading Courses" />;
  else if (all.length === 0) body = <Card><EmptyBlock icon={<BookOpen className="w-10 h-10" />} title="No courses are assigned to you yet." /></Card>;
  else if (rows.length === 0) body = <Card><EmptyBlock icon={<Layers className="w-10 h-10" />} title="You have no classes in this semester." hint="Choose another batch or semester." /></Card>;
  else {
    body = (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="col-fit">Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="col-fit">Type</TableHead>
              {withCredits && <TableHead className="col-fit">Credits</TableHead>}
              <TableHead className="col-fit">Academic Year</TableHead>
              <TableHead className="col-fit">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id} className="cursor-pointer" onClick={() => setPanel({ mode: 'detail', id: o.id })}>
                <TableCell className="font-[550] whitespace-nowrap">{classOptionLabel(o)}</TableCell>
                <TableCell>
                  <span className="font-medium">{o.subjectName}</span> <span className="font-mono text-xs text-muted">{o.subjectCode}</span>
                </TableCell>
                <TableCell><Badge variant="outline">{subjectTypeLabel(o.subjectType)}</Badge></TableCell>
                {withCredits && <TableCell>{formatCredits(o.credits)}</TableCell>}
                <TableCell className="text-muted">{o.academicYear}</TableCell>
                <TableCell><ActiveBadge active={o.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="table-foot">
          <span>{rows.length} class{rows.length === 1 ? '' : 'es'} in this semester.</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <TeachingSelector rows={all} batches={batches} value={selection} onChange={setSelection} idPrefix="courses" disabled={isLoading} />
      <ReadOnlyNote>The courses you teach. Course assignments are managed by the HOD.</ReadOnlyNote>
      {body}
      {panel?.mode === 'detail' && (
        <SidePanel title="Class Course" onClose={() => setPanel(null)}>
          <OfferingDetail id={panel.id} canManage={false} onEdit={() => undefined} />
        </SidePanel>
      )}
    </div>
  );
}

export function ClassCourses({ canManage }: { canManage: boolean }) {
  return canManage ? <DepartmentClassCourses canManage /> : <StaffClassCourses />;
}

function DepartmentClassCourses({ canManage }: { canManage: boolean }) {
  const offerings = useAllSubjectOfferings();
  const batches = useBatches();
  const [ctx, setCtx] = useState<AcademicContext>(EMPTY_CONTEXT);
  const [typeFilter, setTypeFilter] = useState<SubjectType | ''>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [panel, setPanel] = useState<Panel>(null);

  const all = useMemo(() => offerings.data ?? [], [offerings.data]);
  // Only the backend's active cohorts are offered. STAFF see just the cohorts they teach.
  const cohorts = useMemo(() => {
    const list = batches.data ?? [];
    return canManage ? list : list.filter((b) => all.some((o) => o.batchId === b.id));
  }, [batches.data, all, canManage]);

  const rows = all
    .filter(
      (o) =>
        matchesContext(o, ctx) &&
        (!typeFilter || o.subjectType === typeFilter) &&
        (!statusFilter || o.active === (statusFilter === 'active')),
    )
    .sort((a, b) => a.sectionName.localeCompare(b.sectionName));
  // Credits come from the backend's subject record; the column appears only when it sends them.
  const withCredits = hasCredits(all);

  const toolbar = (
    <AcademicContextFilter rows={all} value={ctx} onChange={setCtx} cohorts={cohorts} idPrefix="courses" disabled={offerings.isLoading}>
      <select aria-label="Subject type" className={SELECT_CLASS} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as SubjectType | '')}>
        <option value="">All Types</option>
        {SUBJECT_TYPES.map((t) => <option key={t} value={t}>{SUBJECT_TYPE_LABELS[t]}</option>)}
      </select>
      <select aria-label="Status" className={SELECT_CLASS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}>
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      {(offerings.isFetching || batches.isFetching) && !offerings.isLoading && <Spinner size="sm" />}
      {canManage && (
        <Button className="sm:ml-auto" onClick={() => setPanel({ mode: 'assign' })}>
          <Plus className="w-4 h-4" /> Assign Course
        </Button>
      )}
    </AcademicContextFilter>
  );

  let body;
  if (offerings.isLoading || batches.isLoading) {
    body = <LoadingBlock label="Loading courses..." />;
  } else if (offerings.isError || batches.isError) {
    body = <ErrorBanner error={offerings.error ?? batches.error} fallback="Unable to load courses." title="Error Loading Courses" />;
  } else if (ctx.batchId === null || ctx.semester === null) {
    const cohortEmpty = ctx.batchId !== null && !all.some((o) => o.batchId === ctx.batchId);
    body = (
      <Card>
        <EmptyBlock
          icon={<BookOpen className="w-10 h-10" />}
          title={cohortEmpty ? 'No courses are assigned to this cohort yet.' : ctx.batchId === null ? 'Select a cohort to begin.' : 'Select a semester.'}
          hint={cohortEmpty && canManage ? 'Use Assign Course to add the first one.' : 'Then pick a section to see who teaches each course, or a subject for its details.'}
        />
      </Card>
    );
  } else if (rows.length === 0) {
    body = <Card><EmptyBlock icon={<Layers className="w-10 h-10" />} title="No courses match these filters." /></Card>;
  } else if (ctx.subjectId !== null) {
    // Case C — one subject: details and statistics per section.
    body = <CourseDetail key={rows.map((r) => r.id).join('-')} rows={rows} onOpen={(id) => setPanel({ mode: 'detail', id })} />;
  } else if (ctx.sectionId !== null) {
    // Case B — one class: who teaches each course.
    body = (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="col-fit">Code</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="col-fit">Type</TableHead>
              {withCredits && <TableHead className="col-fit">Credits</TableHead>}
              <TableHead>Assigned Faculty</TableHead>
              <TableHead className="col-fit">Section</TableHead>
              <TableHead className="col-fit">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...rows].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)).map((o) => (
              <TableRow key={o.id} className="cursor-pointer" onClick={() => setPanel({ mode: 'detail', id: o.id })}>
                <TableCell className="font-mono text-xs font-[550]">{o.subjectCode}</TableCell>
                <TableCell className="font-medium">{o.subjectName}</TableCell>
                <TableCell><Badge variant="outline">{subjectTypeLabel(o.subjectType)}</Badge></TableCell>
                {withCredits && <TableCell>{formatCredits(o.credits)}</TableCell>}
                <TableCell className="text-muted">{o.staffName}</TableCell>
                <TableCell className="text-muted">{o.sectionName}</TableCell>
                <TableCell><ActiveBadge active={o.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  } else {
    // Case A — cohort + semester: the subjects taught that semester, one row per subject.
    const groups = new Map<number, SubjectOffering[]>();
    rows.forEach((o) => groups.set(o.subjectId, [...(groups.get(o.subjectId) ?? []), o]));
    const bySubject = [...groups.values()].sort((a, b) => a[0].subjectCode.localeCompare(b[0].subjectCode));
    body = (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="col-fit">Code</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="col-fit">Type</TableHead>
              {withCredits && <TableHead className="col-fit">Credits</TableHead>}
              <TableHead className="col-fit">Sections</TableHead>
              <TableHead className="col-fit">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bySubject.map((group) => {
              const s = group[0];
              return (
                <TableRow key={s.subjectId} className="cursor-pointer" onClick={() => setCtx({ ...ctx, subjectId: s.subjectId })}>
                  <TableCell className="font-mono text-xs font-[550]">{s.subjectCode}</TableCell>
                  <TableCell className="font-medium">{s.subjectName}</TableCell>
                  <TableCell><Badge variant="outline">{subjectTypeLabel(s.subjectType)}</Badge></TableCell>
                  {withCredits && <TableCell>{formatCredits(s.credits)}</TableCell>}
                  <TableCell className="text-muted">{sectionList(group)}</TableCell>
                  <TableCell><ActiveBadge active={group.some((o) => o.active)} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="table-foot">
          <span>{bySubject.length} courses in this semester, from the classes assigned so far.</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}
      {!canManage && <ReadOnlyNote>The courses you teach. Course assignments are managed by the HOD.</ReadOnlyNote>}
      {body}

      {panel?.mode === 'detail' && (
        <SidePanel title="Class Course" onClose={() => setPanel(null)}>
          <OfferingDetail id={panel.id} canManage={canManage} onEdit={(offering) => setPanel({ mode: 'edit', offering })} />
        </SidePanel>
      )}
      {canManage && panel?.mode === 'assign' && (
        <SidePanel title="Assign Course" onClose={() => setPanel(null)} wide>
          <CourseAssignForm initial={ctx} existing={all} onSaved={(o) => setPanel({ mode: 'detail', id: o.id })} />
        </SidePanel>
      )}
      {canManage && panel?.mode === 'edit' && (
        <SidePanel title="Edit Course Assignment" onClose={() => setPanel({ mode: 'detail', id: panel.offering.id })} wide>
          <CourseAssignForm key={panel.offering.id} offering={panel.offering} existing={all} onSaved={(o) => setPanel({ mode: 'detail', id: o.id })} />
        </SidePanel>
      )}
    </div>
  );
}
