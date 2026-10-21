'use client';

import { ReactNode, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Check, UserPlus, Users, X } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import {
  DetailField,
  EmptyBlock,
  ErrorBanner,
  FieldLabel,
  FormError,
  LoadingBlock,
  SidePanel,
} from '@/components/gradebook/shared';
import { ConfirmBox } from '@/components/portfolio/shared';
import { FilterBar, ReadOnlyNote, StatusBadge, SuccessNote } from '@/components/erp/shared';
import { AcademicContextFilter, OfferingPicker } from '@/components/academic/AcademicContextFilter';
import { ContextPrompt, missingContext } from '@/components/academic/ContextGate';
import { TeachingSelector } from '@/components/academic/TeachingSelector';
import { useTeachingSelection } from '@/hooks/useTeachingSelection';
import { useBatches } from '@/hooks/useAcademic';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import {
  useChangeEnrollmentStatus,
  useEnrollSection,
  useEnrollStudent,
  useEnrollmentRoster,
  useMyEnrollments,
  useRegistrationDetail,
  useRegistrationStatus,
  useRegistrationSummary,
  useStudentEnrollments,
} from '@/hooks/useEnrollment';
import { fetchAllPages } from '@/lib/pagination';
import { formatDateTime, SELECT_CLASS } from '@/lib/gradebook-labels';
import { ENROLLMENT_STATUS_BADGE } from '@/lib/erp-labels';
import { AcademicContext, EMPTY_CONTEXT } from '@/lib/academic-context';
import { REGISTRATION_STATUSES, REGISTRATION_STATUS_BADGE, isActiveRegistration } from '@/lib/registration';
import { academicService } from '@/services/api/academic.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { Enrollment, EnrollmentStatus, RegistrationCourse, RegistrationStatus, StudentRegistrationRow } from '@/types/enrollment';
import { SubjectOffering } from '@/types/gradebook';

// Enrollment views (formerly the Course Enrollment page), now tabs of Courses.

const PAGE_SIZE = 50;

// ---------- STUDENT: own courses ----------

/** The student's own courses. Semesters come from the student's enrollments (students can't call /batches). */
export function StudentCourses() {
  const { data, isLoading, isError, error } = useMyEnrollments();
  const [semester, setSemester] = useState('');
  if (isLoading) return <LoadingBlock label="Loading your courses..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load your courses." title="Error Loading Courses" />;
  if (data.length === 0) {
    return <Card><EmptyBlock icon={<BookOpen className="w-10 h-10" />} title="No enrolled courses found." hint="Courses appear here once the department enrolls you." /></Card>;
  }
  const semesters = [...new Set(data.map((e) => e.semester))].sort((a, b) => b - a);
  const rows = data
    .filter((e) => !semester || e.semester === Number(semester))
    .sort((a, b) => b.semester - a.semester || a.subjectCode.localeCompare(b.subjectCode));
  return (
    <div className="space-y-4">
      {semesters.length > 1 && (
        <FilterBar>
          <select aria-label="Semester" className={SELECT_CLASS} value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">All semesters</option>
            {semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </FilterBar>
      )}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="col-fit">Code</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead className="col-fit">Semester</TableHead>
              <TableHead className="col-fit">Academic Year</TableHead>
              <TableHead className="col-fit">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{e.subjectCode}</TableCell>
                <TableCell className="font-medium">{e.subjectName}</TableCell>
                <TableCell className="text-muted whitespace-nowrap">{e.staffName}</TableCell>
                <TableCell className="text-muted">{e.semester}</TableCell>
                <TableCell className="text-muted whitespace-nowrap">{e.academicYear}</TableCell>
                <TableCell><StatusBadge info={ENROLLMENT_STATUS_BADGE[e.status]} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ---------- Shared roster table ----------

function RosterTable({ rows, onSelect, selectedId }: { rows: Enrollment[]; onSelect?: (e: Enrollment) => void; selectedId?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="col-fit">Register No.</TableHead>
          <TableHead>Student Name</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead className="col-fit">Class</TableHead>
          <TableHead>Faculty</TableHead>
          <TableHead className="col-fit">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow
            key={e.id}
            onClick={onSelect ? () => onSelect(e) : undefined}
            className={`${onSelect ? 'cursor-pointer' : ''} ${selectedId === e.id ? 'bg-soft' : ''}`}
          >
            <TableCell className="font-mono text-xs whitespace-nowrap">
              {onSelect ? (
                <button className="underline-offset-2 hover:underline text-left" onClick={(ev) => { ev.stopPropagation(); onSelect(e); }}>
                  {e.registerNumber}
                </button>
              ) : e.registerNumber}
            </TableCell>
            <TableCell className="font-medium whitespace-nowrap">{e.studentName}</TableCell>
            <TableCell className="whitespace-nowrap"><span className="font-mono text-xs text-muted mr-1">{e.subjectCode}</span>{e.subjectName}</TableCell>
            <TableCell className="text-muted whitespace-nowrap">Sec {e.offeringSectionName} · Sem {e.semester}</TableCell>
            <TableCell className="text-muted whitespace-nowrap">{e.staffName}</TableCell>
            <TableCell><StatusBadge info={ENROLLMENT_STATUS_BADGE[e.status]} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------- STAFF: read-only rosters ----------

export function StaffRosters() {
  const { rows: list, batches, selection, setSelection, isLoading, isError, error } = useTeachingSelection();
  const offeringId = selection.offeringId;
  const roster = useEnrollmentRoster(offeringId);

  if (isLoading) return <LoadingBlock label="Loading your courses..." />;
  if (isError) return <ErrorBanner error={error} fallback="Unable to load your courses." />;

  return (
    <div className="space-y-4">
      <ReadOnlyNote>Rosters of the courses you teach. Enrollment is managed by the HOD.</ReadOnlyNote>
      {list.length === 0 ? (
        <Card><EmptyBlock icon={<BookOpen className="w-10 h-10" />} title="You have no assigned courses." /></Card>
      ) : (
        <>
          <TeachingSelector rows={list} batches={batches} value={selection} onChange={setSelection} classMode="required" idPrefix="roster">
            {roster.isFetching && <Spinner size="sm" />}
          </TeachingSelector>
          {offeringId === null ? (
            <Card><EmptyBlock icon={<Users className="w-10 h-10" />} title="Choose a class to see its roster." /></Card>
          ) : roster.isLoading ? (
            <LoadingBlock label="Loading roster..." />
          ) : roster.isError || !roster.data ? (
            <ErrorBanner error={roster.error} fallback="Unable to load the roster." />
          ) : roster.data.length === 0 ? (
            <Card><EmptyBlock icon={<Users className="w-10 h-10" />} title="No students are enrolled in this course yet." /></Card>
          ) : (
            <Card>
              <div className="px-6 py-3 border-b border-line text-xs text-muted">
                {roster.data.filter((e) => e.status === 'ENROLLED').length} enrolled · {roster.data.length} total rows
              </div>
              <RosterTable rows={roster.data} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---------- HOD ----------

const STATUS_ACTIONS: Record<EnrollmentStatus, { target: EnrollmentStatus; label: string; confirm: string; variant: 'primary' | 'danger' }[]> = {
  ENROLLED: [
    { target: 'DROPPED', label: 'Drop', confirm: 'Drop this student from the course?', variant: 'danger' },
    { target: 'COMPLETED', label: 'Mark Completed', confirm: 'Mark this enrollment as completed? Completed enrollments cannot be changed again.', variant: 'primary' },
  ],
  DROPPED: [
    { target: 'ENROLLED', label: 'Reactivate', confirm: 'Reactivate this enrollment?', variant: 'primary' },
  ],
  COMPLETED: [],
};

function EnrollmentDetail({ enrollment, onChanged }: { enrollment: Enrollment; onChanged: (e: Enrollment) => void }) {
  const change = useChangeEnrollmentStatus();
  const [pending, setPending] = useState<(typeof STATUS_ACTIONS)[EnrollmentStatus][number] | null>(null);
  const actions = STATUS_ACTIONS[enrollment.status];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Student" value={enrollment.studentName} />
        <DetailField label="Register No." value={<span className="font-mono text-xs">{enrollment.registerNumber}</span>} />
        <DetailField label="Student Section" value={enrollment.studentSectionName} />
        <DetailField label="Status" value={<StatusBadge info={ENROLLMENT_STATUS_BADGE[enrollment.status]} />} />
        <DetailField label="Subject" value={`${enrollment.subjectCode} — ${enrollment.subjectName}`} />
        <DetailField label="Course Section" value={enrollment.offeringSectionName} />
        <DetailField label="Academic Year" value={enrollment.academicYear} />
        <DetailField label="Semester" value={enrollment.semester} />
        <DetailField label="Faculty" value={enrollment.staffName} />
        <DetailField label="Enrolled" value={formatDateTime(enrollment.enrolledAt)} />
      </div>
      {change.isError && <FormError error={change.error} fallback="Unable to update the enrollment." />}
      {pending ? (
        <ConfirmBox
          message={pending.confirm}
          confirmLabel={pending.label}
          variant={pending.variant}
          isLoading={change.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() => change.mutate({ enrollment, status: pending.target }, {
            onSuccess: (updated) => { setPending(null); onChanged(updated); },
          })}
        />
      ) : actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.target} size="sm" variant={a.variant === 'danger' ? 'danger' : 'secondary'} onClick={() => { change.reset(); setPending(a); }}>
              {a.label}
            </Button>
          ))}
        </div>
      ) : (
        <ReadOnlyNote>Completed enrollments cannot be changed.</ReadOnlyNote>
      )}
    </div>
  );
}

function EnrollSectionForm({ offerings }: { offerings: SubjectOffering[] }) {
  const [offering, setOffering] = useState<SubjectOffering | null>(null);
  const [confirming, setConfirming] = useState(false);
  const enroll = useEnrollSection();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Enrolls every active student of the course&apos;s section who has no enrollment yet. Students who dropped or completed are left unchanged.
      </p>
      <OfferingPicker rows={offerings.filter((o) => o.active)} value={offering?.id ?? null} stacked idPrefix="enroll-section"
        onChange={(o) => { setOffering(o); setConfirming(false); enroll.reset(); }} />
      {enroll.isError && <FormError error={enroll.error} fallback="Unable to enroll the section." />}
      {enroll.isSuccess && (
        <div className="rounded-[10px] bg-ok-soft border border-ok/25 p-3 text-sm text-ok space-y-0.5" role="status">
          <p className="font-medium">Section enrolled.</p>
          <p>{enroll.data.enrolled} newly enrolled · {enroll.data.alreadyEnrolled} already enrolled · {enroll.data.activeStudentsInSection} active students in section</p>
          {(enroll.data.skippedDropped > 0 || enroll.data.skippedCompleted > 0) && (
            <p>Skipped: {enroll.data.skippedDropped} dropped, {enroll.data.skippedCompleted} completed</p>
          )}
        </div>
      )}
      {confirming && offering ? (
        <ConfirmBox
          message={<>Enroll section <strong>{offering.sectionName}</strong> ({offering.batchName}) in <strong>{offering.subjectCode} — {offering.subjectName}</strong>?</>}
          confirmLabel="Enroll Section"
          isLoading={enroll.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => enroll.mutate(offering.id, { onSettled: () => setConfirming(false) })}
        />
      ) : (
        <Button disabled={!offering} onClick={() => { enroll.reset(); setConfirming(true); }}>Enroll Section</Button>
      )}
    </div>
  );
}

/**
 * Candidates are the section's active students (GET /sections/{id}/students, all pages) who are not yet in
 * this course — including students with no enrollments at all.
 */
function EnrollStudentForm({ offerings }: { offerings: SubjectOffering[] }) {
  const [offering, setOffering] = useState<SubjectOffering | null>(null);
  const [studentId, setStudentId] = useState('');
  const enroll = useEnrollStudent();

  const sectionStudents = useQuery({
    queryKey: [QUERY_KEYS.SECTION_STUDENTS, offering?.sectionId],
    queryFn: () => fetchAllPages((page) => academicService.getSectionStudents(offering!.sectionId, page, 200)),
    enabled: !!offering,
    refetchInterval: false,
  });
  const roster = useEnrollmentRoster(offering ? offering.id : null);

  const candidates = useMemo(() => {
    if (!sectionStudents.data || !roster.data) return [];
    const inOffering = new Set(roster.data.map((e) => e.studentId));
    return sectionStudents.data.filter((s) => !inOffering.has(s.studentId));
  }, [sectionStudents.data, roster.data]);

  return (
    <div className="space-y-4">
      <OfferingPicker rows={offerings.filter((o) => o.active)} value={offering?.id ?? null} stacked idPrefix="enroll-one"
        onChange={(o) => { setOffering(o); setStudentId(''); enroll.reset(); }} />
      {offering && (
        <div className="space-y-1.5">
          <FieldLabel htmlFor="enroll-one-student">Student</FieldLabel>
          {sectionStudents.isLoading || roster.isLoading ? (
            <Spinner size="sm" />
          ) : sectionStudents.isError || roster.isError ? (
            <FormError error={sectionStudents.error ?? roster.error} fallback="Unable to load students." />
          ) : (
            <select id="enroll-one-student" className={`${SELECT_CLASS} w-full`} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">{candidates.length ? 'Select…' : 'No students available'}</option>
              {candidates.map((c) => <option key={c.studentId} value={c.studentId}>{c.registerNumber} — {c.name}</option>)}
            </select>
          )}
          <p className="text-[11px] text-muted">
            Lists active students of section {offering.sectionName} who are not yet in this course.
            To add a whole section, use Enroll Section. Dropped students are reactivated from their enrollment row.
          </p>
        </div>
      )}
      {enroll.isError && <FormError error={enroll.error} fallback="Unable to enroll the student." />}
      {enroll.isSuccess && <SuccessNote>{enroll.data.studentName} enrolled in {enroll.data.subjectCode}.</SuccessNote>}
      <Button
        disabled={!offering || !studentId}
        isLoading={enroll.isPending}
        onClick={() => offering && enroll.mutate({ studentId: Number(studentId), subjectOfferingId: offering.id }, { onSuccess: () => setStudentId('') })}
      >
        <UserPlus className="w-4 h-4" /> Enroll Student
      </Button>
    </div>
  );
}

// ---------- HOD: student-level registration overview ----------
// One row per student. Status, counts, filter counts and the per-student detail all come from the backend
// (contract C) — the frontend never calculates registration status itself.

type StatusFilter = '' | RegistrationStatus;

function RegistrationTable({ rows, selectedId, onSelect }: {
  rows: StudentRegistrationRow[]; selectedId?: number; onSelect: (r: StudentRegistrationRow) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="col-fit">Register No.</TableHead>
          <TableHead>Student Name</TableHead>
          <TableHead className="col-fit">Class</TableHead>
          <TableHead className="col-fit">Courses Registered</TableHead>
          <TableHead className="col-fit">Registration Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.studentId} onClick={() => onSelect(r)} className={`cursor-pointer ${selectedId === r.studentId ? 'bg-soft' : ''}`}>
            <TableCell className="font-mono text-xs whitespace-nowrap">
              <button className="underline-offset-2 hover:underline text-left" onClick={(ev) => { ev.stopPropagation(); onSelect(r); }}
                aria-label={`Open course registration of ${r.studentName}`}>
                {r.registerNumber}
              </button>
            </TableCell>
            <TableCell className="font-medium whitespace-nowrap">{r.studentName}</TableCell>
            <TableCell className="text-muted whitespace-nowrap">Sec {r.sectionName} · Sem {r.semester}</TableCell>
            <TableCell className="whitespace-nowrap">
              <span className="tabular-nums font-[550]">{r.registeredCount}</span>
              {r.compulsoryRequired !== null && (
                <span className="block text-[11px] text-muted">
                  Compulsory {r.compulsoryRegistered}/{r.compulsoryRequired} · Electives {r.electiveGroupsSatisfied}/{r.electiveGroupsRequired}
                </span>
              )}
            </TableCell>
            <TableCell><StatusBadge info={REGISTRATION_STATUS_BADGE[r.status]} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h4 className="text-[11px] font-[600] uppercase tracking-wide text-muted">{children}</h4>;
}

/** One subject line of the detail: ✓ registered, otherwise ✕ with Dropped / Not Registered. */
function CourseLine({ course, onManage }: { course: RegistrationCourse; onManage?: () => void }) {
  return (
    <li className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 py-2.5">
      {course.registered
        ? <Check className="w-4 h-4 text-ok shrink-0" aria-label="Registered" />
        : <X className="w-4 h-4 text-danger shrink-0" aria-label="Not registered" />}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-[550] text-fg">{course.name}</span>
        <span className="block text-[11.5px] text-muted">
          <span className="font-mono">{course.code}</span>{course.staffName ? ` · ${course.staffName}` : ' · No faculty assigned'}
        </span>
      </span>
      <span className="flex items-center gap-2 max-sm:pl-7">
        {course.enrollmentStatus
          ? <StatusBadge info={ENROLLMENT_STATUS_BADGE[course.enrollmentStatus]} />
          : <Badge variant="outline">Not Registered</Badge>}
        {onManage && <Button size="sm" variant="secondary" onClick={onManage}>Manage</Button>}
      </span>
    </li>
  );
}

function StudentRegistrationDetail({ studentId, semester, onManage }: { studentId: number; semester: number; onManage: (e: Enrollment) => void }) {
  const detail = useRegistrationDetail(studentId, semester);
  const enrollments = useStudentEnrollments(studentId);
  if (detail.isLoading) return <LoadingBlock label="Loading registration..." />;
  if (detail.isError || !detail.data) return <ErrorBanner error={detail.error} fallback="Unable to load this student's registration." />;

  const d = detail.data;
  const rows = new Map((enrollments.data ?? []).map((e) => [e.id, e]));
  // Manage needs the full enrollment row; it appears once the student's enrollments have loaded.
  const manage = (c: RegistrationCourse) => {
    const row = c.enrollmentId !== null ? rows.get(c.enrollmentId) : undefined;
    return row ? () => onManage(row) : undefined;
  };
  const shown = new Set([...d.compulsory, ...d.electiveGroups.flatMap((g) => g.options), ...d.otherRegistrations].map((c) => c.enrollmentId));
  const notCounted = (enrollments.data ?? []).filter((e) => e.semester === semester && !isActiveRegistration(e) && !shown.has(e.id));
  const compulsoryDone = d.compulsory.filter((c) => c.registered).length;
  const groupsDone = d.electiveGroups.filter((g) => g.satisfied).length;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionHeading>Student information</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Student" value={d.student.studentName} />
          <DetailField label="Register No." value={<span className="font-mono text-xs">{d.student.registerNumber}</span>} />
          <DetailField label="Cohort" value={d.student.batchName} />
          <DetailField label="Semester" value={d.student.semester} />
          <DetailField label="Section" value={d.student.sectionName} />
          <DetailField label="Registration Status" value={<StatusBadge info={REGISTRATION_STATUS_BADGE[d.status]} />} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading>Course registration summary</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Courses registered" value={d.registeredCount} />
          <DetailField label="Compulsory courses" value={d.curriculumConfigured ? `${compulsoryDone}/${d.compulsory.length}` : 'Not configured'} />
          <DetailField label="Elective requirements" value={d.curriculumConfigured ? `${groupsDone}/${d.electiveGroups.length}` : 'Not configured'} />
          <DetailField label="Overall" value={REGISTRATION_STATUS_BADGE[d.status].label} />
        </div>
        {!d.curriculumConfigured && (
          <ReadOnlyNote>No curriculum is configured for this cohort and semester, so completeness can&apos;t be judged. Set it in Courses → Curriculum.</ReadOnlyNote>
        )}
        {enrollments.isError && <FormError error={enrollments.error} fallback="Enrollment actions are unavailable: the student's enrollments couldn't be loaded." />}
      </section>

      {d.curriculumConfigured && (
        <>
          <section className="space-y-2">
            <SectionHeading>Compulsory courses</SectionHeading>
            {d.compulsory.length === 0 ? (
              <p className="text-[13px] text-muted">No compulsory courses for this semester.</p>
            ) : (
              <ul className="divide-y divide-line">{d.compulsory.map((c) => <CourseLine key={c.subjectId} course={c} onManage={manage(c)} />)}</ul>
            )}
          </section>

          <section className="space-y-2">
            <SectionHeading>Elective groups</SectionHeading>
            {d.electiveGroups.length === 0 ? (
              <p className="text-[13px] text-muted">No elective groups for this semester.</p>
            ) : (
              <div className="space-y-3">
                {d.electiveGroups.map((g) => {
                  const selected = g.options.filter((o) => o.registered);
                  const others = g.options.filter((o) => !o.registered);
                  const remaining = Math.max(0, g.requiredSelections - g.selectedCount);
                  return (
                    <div key={g.groupId} className="rounded-[10px] border border-line p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-[600] text-fg">{g.name} — Choose {g.requiredSelections}</p>
                        <span className="text-[11.5px] text-muted">{g.selectedCount} of {g.requiredSelections} selected{remaining > 0 && ` · ${remaining} more needed`}</span>
                        <Badge variant={g.satisfied ? 'success' : 'warning'} className="ml-auto">{g.satisfied ? 'Satisfied' : 'Selection Pending'}</Badge>
                      </div>
                      {selected.length > 0 && <ul className="divide-y divide-line">{selected.map((o) => <CourseLine key={o.subjectId} course={o} onManage={manage(o)} />)}</ul>}
                      {others.length > 0 && (
                        <div className="text-[12px] text-muted">
                          <p>Other options:</p>
                          <ul className="mt-1 space-y-1 pl-3">
                            {others.map((o) => (
                              <li key={o.subjectId} className="flex flex-wrap items-center gap-2">
                                <span>{o.name} <span className="font-mono text-[11px]">{o.code}</span></span>
                                {o.enrollmentStatus && <StatusBadge info={ENROLLMENT_STATUS_BADGE[o.enrollmentStatus]} />}
                                {manage(o) && <button type="button" className="underline underline-offset-2" onClick={manage(o)}>Manage</button>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <section className="space-y-2">
        <SectionHeading>{d.curriculumConfigured ? 'Other registrations' : 'Registered courses'}</SectionHeading>
        {d.otherRegistrations.length === 0 ? (
          <p className="text-[13px] text-muted">{d.curriculumConfigured ? 'No registrations outside the curriculum.' : 'No courses registered this semester.'}</p>
        ) : (
          <ul className="divide-y divide-line">{d.otherRegistrations.map((c) => <CourseLine key={`${c.subjectId}-${c.enrollmentId}`} course={c} onManage={manage(c)} />)}</ul>
        )}
      </section>

      {notCounted.length > 0 && (
        <section className="space-y-2">
          <SectionHeading>Not counted</SectionHeading>
          <p className="text-[12px] text-muted">Dropped enrollments and enrollments in deactivated courses don&apos;t count as registrations.</p>
          <ul className="divide-y divide-line">
            {notCounted.map((e) => (
              <li key={e.id} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-fg">{e.subjectName}</span>
                  <span className="block text-[11.5px] text-muted">
                    <span className="font-mono">{e.subjectCode}</span> · {e.academicYear}{e.offeringActive === false && ' · course deactivated'}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge info={ENROLLMENT_STATUS_BADGE[e.status]} />
                  <Button size="sm" variant="secondary" onClick={() => onManage(e)}>Manage</Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type HodPanel =
  | { mode: 'student'; studentId: number }
  | { mode: 'detail'; enrollment: Enrollment; fromStudentId: number | null }
  | { mode: 'section' }
  | { mode: 'one' }
  | null;

export function HodEnrollments() {
  const offerings = useAllSubjectOfferings();
  const batches = useBatches();
  const [ctx, setCtx] = useState<AcademicContext>(EMPTY_CONTEXT);
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<HodPanel>(null);
  const offeringList = useMemo(() => offerings.data ?? [], [offerings.data]);

  // Cohort-first: nothing loads until a class (cohort → semester → section) is chosen.
  const prompt = missingContext(ctx, 'section');
  const scope = { batchId: ctx.batchId ?? 0, semester: ctx.semester ?? 0, sectionId: ctx.sectionId ?? undefined };
  const summary = useRegistrationSummary(scope, !prompt);
  // Paging, status filtering and counting all happen on the server, over unique students.
  const list = useRegistrationStatus({ ...scope, registrationStatus: status || undefined, page, size: PAGE_SIZE }, !prompt);

  const loading = summary.isLoading || list.isLoading;
  const failed = summary.isError ? summary.error : list.isError ? list.error : null;
  const backTo = panel?.mode === 'detail' ? panel.fromStudentId : null;
  const s = summary.data;

  return (
    <div className="space-y-4">
      <AcademicContextFilter rows={offeringList} value={ctx} cohorts={batches.data} idPrefix="enrollments" levels={['cohort', 'semester', 'section']}
        onChange={(next) => { setCtx(next); setPage(0); setPanel(null); }} disabled={offerings.isLoading}>
        <select aria-label="Registration status" className={SELECT_CLASS} value={status} disabled={!!prompt}
          onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(0); }}>
          <option value="">All Students{s ? ` (${s.totalStudents})` : ''}</option>
          {REGISTRATION_STATUSES.map((st) => (
            <option key={st} value={st}>{REGISTRATION_STATUS_BADGE[st].label}{s ? ` (${s.counts[st]})` : ''}</option>
          ))}
        </select>
        {(summary.isFetching || list.isFetching) && !loading && <Spinner size="sm" />}
      </AcademicContextFilter>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setPanel({ mode: 'section' })}><Users className="w-4 h-4" /> Enroll Section</Button>
        <Button size="sm" variant="secondary" onClick={() => setPanel({ mode: 'one' })}><UserPlus className="w-4 h-4" /> Enroll One Student</Button>
      </div>
      {prompt ? (
        <ContextPrompt icon={<BookOpen className="w-10 h-10" />} title={prompt}
          hint={ctx.batchId === null ? 'Then choose the semester and section to see each student’s course registration.' : undefined} />
      ) : loading ? (
        <LoadingBlock label="Loading course registrations..." />
      ) : failed || !s || !list.data ? (
        <ErrorBanner error={failed} fallback="Unable to load course registrations." title="Error Loading Enrollments" />
      ) : (
        <Card>
          <div className="px-6 py-3 border-b border-line text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
            <span>{s.totalStudents} {s.totalStudents === 1 ? 'student' : 'students'}</span>
            <span>{s.offeredCourseCount} active {s.offeredCourseCount === 1 ? 'course' : 'courses'} offered to this class</span>
            <span>{s.curriculumConfigured ? 'Curriculum configured' : 'No curriculum configured — set it in the Curriculum tab'}</span>
          </div>
          {s.totalStudents === 0 ? (
            <EmptyBlock icon={<Users className="w-10 h-10" />} title="No students found in this class." />
          ) : list.data.content.length === 0 ? (
            <EmptyBlock icon={<Users className="w-10 h-10" />} title="No students match this registration status." />
          ) : (
            <>
              <RegistrationTable rows={list.data.content} selectedId={panel?.mode === 'student' ? panel.studentId : undefined}
                onSelect={(r) => setPanel({ mode: 'student', studentId: r.studentId })} />
              <Pagination data={list.data} onPageChange={setPage} />
            </>
          )}
        </Card>
      )}
      {panel && (
        <SidePanel
          title={panel.mode === 'student' ? 'Course Registration' : panel.mode === 'detail' ? 'Enrollment' : panel.mode === 'section' ? 'Enroll Section' : 'Enroll One Student'}
          onClose={() => setPanel(null)}
          wide={panel.mode !== 'detail'}
        >
          {panel.mode === 'student' && ctx.semester !== null && (
            <StudentRegistrationDetail studentId={panel.studentId} semester={ctx.semester}
              onManage={(e) => setPanel({ mode: 'detail', enrollment: e, fromStudentId: panel.studentId })} />
          )}
          {panel.mode === 'detail' && (
            <div className="space-y-4">
              {backTo !== null && (
                <button type="button" className="f-btn" onClick={() => setPanel({ mode: 'student', studentId: backTo })}>
                  <ArrowLeft className="w-4 h-4" /> Back to student
                </button>
              )}
              <EnrollmentDetail key={panel.enrollment.id} enrollment={panel.enrollment}
                onChanged={(e) => setPanel({ mode: 'detail', enrollment: e, fromStudentId: backTo })} />
            </div>
          )}
          {panel.mode === 'section' && (offerings.isLoading ? <Spinner /> : <EnrollSectionForm offerings={offeringList} />)}
          {panel.mode === 'one' && (offerings.isLoading ? <Spinner /> : <EnrollStudentForm offerings={offeringList} />)}
        </SidePanel>
      )}
    </div>
  );
}
