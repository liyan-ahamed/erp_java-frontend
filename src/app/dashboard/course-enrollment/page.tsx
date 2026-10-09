'use client';

import { useMemo, useState } from 'react';
import { BookOpen, UserPlus, Users } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
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
import { FilterBar, ReadOnlyNote, StatusBadge, SuccessNote, offeringOptionLabel } from '@/components/erp/shared';
import { useAuth } from '@/contexts/auth-context';
import { useSections } from '@/hooks/useAcademic';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import {
  useChangeEnrollmentStatus,
  useEnrollSection,
  useEnrollStudent,
  useEnrollmentRoster,
  useEnrollments,
  useMyEnrollments,
} from '@/hooks/useEnrollment';
import { fetchAllPages } from '@/lib/pagination';
import { formatDateTime, SELECT_CLASS } from '@/lib/gradebook-labels';
import { ENROLLMENT_STATUSES, ENROLLMENT_STATUS_BADGE } from '@/lib/erp-labels';
import { enrollmentService } from '@/services/api/enrollment.service';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { Enrollment, EnrollmentStatus } from '@/types/enrollment';
import { SubjectOffering } from '@/types/gradebook';

const PAGE_SIZE = 50;

// ---------- STUDENT ----------

function StudentEnrollments() {
  const { data, isLoading, isError, error } = useMyEnrollments();
  if (isLoading) return <LoadingBlock label="Loading your courses..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load your courses." title="Error Loading Courses" />;
  if (data.length === 0) {
    return <Card><EmptyBlock icon={<BookOpen className="w-10 h-10" />} title="No enrolled courses found." hint="Courses appear here once the department enrolls you." /></Card>;
  }
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject Code</TableHead>
            <TableHead>Subject Name</TableHead>
            <TableHead>Faculty</TableHead>
            <TableHead>Academic Year</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-mono text-xs whitespace-nowrap">{e.subjectCode}</TableCell>
              <TableCell className="font-medium">{e.subjectName}</TableCell>
              <TableCell className="text-[#666666] whitespace-nowrap">{e.staffName}</TableCell>
              <TableCell className="text-[#666666] whitespace-nowrap">{e.academicYear}</TableCell>
              <TableCell className="text-[#666666]">{e.semester}</TableCell>
              <TableCell><StatusBadge info={ENROLLMENT_STATUS_BADGE[e.status]} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ---------- Shared roster table ----------

function RosterTable({ rows, onSelect, selectedId }: { rows: Enrollment[]; onSelect?: (e: Enrollment) => void; selectedId?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Register No.</TableHead>
          <TableHead>Student Name</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>Faculty</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow
            key={e.id}
            onClick={onSelect ? () => onSelect(e) : undefined}
            className={`${onSelect ? 'cursor-pointer' : ''} ${selectedId === e.id ? 'bg-[#F5F5F5]' : ''}`}
          >
            <TableCell className="font-mono text-xs whitespace-nowrap">
              {onSelect ? (
                <button className="underline-offset-2 hover:underline text-left" onClick={(ev) => { ev.stopPropagation(); onSelect(e); }}>
                  {e.registerNumber}
                </button>
              ) : e.registerNumber}
            </TableCell>
            <TableCell className="font-medium whitespace-nowrap">{e.studentName}</TableCell>
            <TableCell className="whitespace-nowrap"><span className="font-mono text-xs text-[#9A9A9A] mr-1">{e.subjectCode}</span>{e.subjectName}</TableCell>
            <TableCell className="text-[#666666] whitespace-nowrap">Sec {e.offeringSectionName} · Sem {e.semester}</TableCell>
            <TableCell className="text-[#666666] whitespace-nowrap">{e.staffName}</TableCell>
            <TableCell><StatusBadge info={ENROLLMENT_STATUS_BADGE[e.status]} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------- STAFF ----------

function StaffRosters() {
  const offerings = useAllSubjectOfferings();
  const [offeringId, setOfferingId] = useState<number | null>(null);
  const roster = useEnrollmentRoster(offeringId);

  if (offerings.isLoading) return <LoadingBlock label="Loading your offerings..." />;
  if (offerings.isError) return <ErrorBanner error={offerings.error} fallback="Unable to load your subject offerings." />;
  const list = offerings.data ?? [];

  return (
    <div className="space-y-4">
      <ReadOnlyNote>Rosters of your own subject offerings. Enrollment is managed by the HOD.</ReadOnlyNote>
      {list.length === 0 ? (
        <Card><EmptyBlock icon={<BookOpen className="w-10 h-10" />} title="You have no subject offerings." /></Card>
      ) : (
        <>
          <FilterBar>
            <select aria-label="Subject offering" className={SELECT_CLASS} value={offeringId ?? ''} onChange={(e) => setOfferingId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select a subject offering…</option>
              {list.map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}</option>)}
            </select>
            {roster.isFetching && <Spinner size="sm" />}
          </FilterBar>
          {offeringId === null ? (
            <Card><EmptyBlock icon={<Users className="w-10 h-10" />} title="Choose a subject offering to see its roster." /></Card>
          ) : roster.isLoading ? (
            <LoadingBlock label="Loading roster..." />
          ) : roster.isError || !roster.data ? (
            <ErrorBanner error={roster.error} fallback="Unable to load the roster." />
          ) : roster.data.length === 0 ? (
            <Card><EmptyBlock icon={<Users className="w-10 h-10" />} title="No students are enrolled in this offering yet." /></Card>
          ) : (
            <Card>
              <div className="px-6 py-3 border-b border-[#F5F5F5] text-xs text-[#9A9A9A]">
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
    { target: 'DROPPED', label: 'Drop', confirm: 'Drop this student from the subject offering?', variant: 'danger' },
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
        <DetailField label="Offering Section" value={enrollment.offeringSectionName} />
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
  const [offeringId, setOfferingId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const enroll = useEnrollSection();
  const offering = offerings.find((o) => o.id === Number(offeringId));

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#666666]">
        Enrolls every active student of the offering&apos;s section who has no enrollment yet. Students who dropped or completed are left unchanged.
      </p>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="enroll-section-offering">Subject Offering</FieldLabel>
        <select id="enroll-section-offering" className={`${SELECT_CLASS} w-full`} value={offeringId}
          onChange={(e) => { setOfferingId(e.target.value); setConfirming(false); enroll.reset(); }}>
          <option value="">Select…</option>
          {offerings.filter((o) => o.active).map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}</option>)}
        </select>
      </div>
      {enroll.isError && <FormError error={enroll.error} fallback="Unable to enroll the section." />}
      {enroll.isSuccess && (
        <div className="rounded-[10px] bg-green-50 border border-green-100 p-3 text-sm text-green-800 space-y-0.5" role="status">
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
 * The backend has no student lookup endpoint, so candidates come from existing enrollment records
 * of the offering's section (students enrolled in another subject of that section).
 */
function EnrollStudentForm({ offerings }: { offerings: SubjectOffering[] }) {
  const [offeringId, setOfferingId] = useState('');
  const [studentId, setStudentId] = useState('');
  const enroll = useEnrollStudent();
  const offering = offerings.find((o) => o.id === Number(offeringId));

  const sectionEnrollments = useQuery({
    queryKey: [QUERY_KEYS.ENROLLMENTS, 'section-candidates', offering?.sectionId],
    queryFn: () => fetchAllPages((page) => enrollmentService.getEnrollments({ page, size: 200, sectionId: offering!.sectionId })),
    enabled: !!offering,
    refetchInterval: false,
  });
  const roster = useEnrollmentRoster(offering ? offering.id : null);

  const candidates = useMemo(() => {
    if (!sectionEnrollments.data || !roster.data) return [];
    const inOffering = new Set(roster.data.map((e) => e.studentId));
    const map = new Map<number, Enrollment>();
    sectionEnrollments.data.forEach((e) => { if (!inOffering.has(e.studentId)) map.set(e.studentId, e); });
    return [...map.values()].sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
  }, [sectionEnrollments.data, roster.data]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <FieldLabel htmlFor="enroll-one-offering">Subject Offering</FieldLabel>
        <select id="enroll-one-offering" className={`${SELECT_CLASS} w-full`} value={offeringId}
          onChange={(e) => { setOfferingId(e.target.value); setStudentId(''); enroll.reset(); }}>
          <option value="">Select…</option>
          {offerings.filter((o) => o.active).map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}</option>)}
        </select>
      </div>
      {offering && (
        <div className="space-y-1.5">
          <FieldLabel htmlFor="enroll-one-student">Student</FieldLabel>
          {sectionEnrollments.isLoading || roster.isLoading ? (
            <Spinner size="sm" />
          ) : sectionEnrollments.isError ? (
            <FormError error={sectionEnrollments.error} fallback="Unable to load students." />
          ) : (
            <select id="enroll-one-student" className={`${SELECT_CLASS} w-full`} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">{candidates.length ? 'Select…' : 'No students available'}</option>
              {candidates.map((c) => <option key={c.studentId} value={c.studentId}>{c.registerNumber} — {c.studentName} (Sec {c.studentSectionName})</option>)}
            </select>
          )}
          <p className="text-[11px] text-[#9A9A9A]">
            Lists students of section {offering.sectionName} already enrolled in another subject and not yet in this offering.
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
        <UserPlus className="w-4 h-4 mr-1.5" /> Enroll Student
      </Button>
    </div>
  );
}

type HodPanel = { mode: 'detail'; enrollment: Enrollment } | { mode: 'section' } | { mode: 'student' } | null;

function HodEnrollments() {
  const offerings = useAllSubjectOfferings();
  const sections = useSections(null);
  const [filters, setFilters] = useState({ offeringId: '', sectionId: '', status: '' });
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<HodPanel>(null);

  const query = {
    page,
    size: PAGE_SIZE,
    subjectOfferingId: filters.offeringId ? Number(filters.offeringId) : undefined,
    sectionId: filters.sectionId ? Number(filters.sectionId) : undefined,
    status: (filters.status || undefined) as EnrollmentStatus | undefined,
  };
  const { data, isLoading, isError, error, isFetching } = useEnrollments(query);
  const setFilter = (key: keyof typeof filters, value: string) => { setFilters({ ...filters, [key]: value }); setPage(0); };

  const offeringList = offerings.data ?? [];

  const toolbar = (
    <div className="space-y-3">
      <FilterBar>
        <select aria-label="Filter by subject offering" className={SELECT_CLASS} value={filters.offeringId} onChange={(e) => setFilter('offeringId', e.target.value)}>
          <option value="">All Offerings</option>
          {offeringList.map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}</option>)}
        </select>
        <select aria-label="Filter by section" className={SELECT_CLASS} value={filters.sectionId} onChange={(e) => setFilter('sectionId', e.target.value)}>
          <option value="">All Sections</option>
          {(sections.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.batchName} — Sec {s.name}</option>)}
        </select>
        <select aria-label="Filter by status" className={SELECT_CLASS} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {ENROLLMENT_STATUSES.map((s) => <option key={s} value={s}>{ENROLLMENT_STATUS_BADGE[s].label}</option>)}
        </select>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </FilterBar>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setPanel({ mode: 'section' })}><Users className="w-4 h-4 mr-1.5" /> Enroll Section</Button>
        <Button size="sm" variant="secondary" onClick={() => setPanel({ mode: 'student' })}><UserPlus className="w-4 h-4 mr-1.5" /> Enroll One Student</Button>
      </div>
    </div>
  );

  return (
    <PageContainer contextArea={toolbar} rawLayout>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {isLoading ? (
            <LoadingBlock label="Loading enrollments..." />
          ) : isError || !data ? (
            <ErrorBanner error={error} fallback="Unable to load enrollments." title="Error Loading Enrollments" />
          ) : data.content.length === 0 ? (
            <Card><EmptyBlock icon={<BookOpen className="w-10 h-10" />} title="No enrollments match these filters." /></Card>
          ) : (
            <Card>
              <RosterTable
                rows={data.content}
                selectedId={panel?.mode === 'detail' ? panel.enrollment.id : undefined}
                onSelect={(e) => setPanel({ mode: 'detail', enrollment: e })}
              />
              <Pagination data={data} onPageChange={setPage} />
            </Card>
          )}
        </div>
        {panel && (
          <SidePanel
            title={panel.mode === 'detail' ? 'Enrollment' : panel.mode === 'section' ? 'Enroll Section' : 'Enroll One Student'}
            onClose={() => setPanel(null)}
          >
            {panel.mode === 'detail' && (
              <EnrollmentDetail key={panel.enrollment.id} enrollment={panel.enrollment} onChanged={(e) => setPanel({ mode: 'detail', enrollment: e })} />
            )}
            {panel.mode === 'section' && (offerings.isLoading ? <Spinner /> : <EnrollSectionForm offerings={offeringList} />)}
            {panel.mode === 'student' && (offerings.isLoading ? <Spinner /> : <EnrollStudentForm offerings={offeringList} />)}
          </SidePanel>
        )}
      </div>
    </PageContainer>
  );
}

function CourseEnrollmentView() {
  const { hasRole } = useAuth();
  if (hasRole('ROLE_HOD')) return <HodEnrollments />;
  return (
    <PageContainer rawLayout>
      {hasRole('ROLE_STAFF') ? <StaffRosters /> : <StudentEnrollments />}
    </PageContainer>
  );
}

export default function CourseEnrollmentPage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT']}>
      <CourseEnrollmentView />
    </RequireRole>
  );
}
