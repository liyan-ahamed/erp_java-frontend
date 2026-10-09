'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Plus } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { FilterBar, ReadOnlyNote, StatTile, StatusBadge, offeringOptionLabel } from '@/components/erp/shared';
import { AttendanceSessionForm } from '@/components/erp/AttendanceSessionForm';
import { useAuth } from '@/contexts/auth-context';
import { useSections } from '@/hooks/useAcademic';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import { useAttendanceSessions, useClassAttendanceSummary, useMyAttendance } from '@/hooks/useAttendance';
import { SELECT_CLASS, formatDate } from '@/lib/gradebook-labels';
import { NO_ATTENDANCE_DATA_TEXT, SESSION_STATUS_BADGE, formatPercent } from '@/lib/erp-labels';
import { ROUTES } from '@/constants/routes';
import { AttendanceSessionStatus, AttendanceSummary } from '@/types/attendance';

// ---------- Shared bits ----------

/** Percentage as returned by the backend; null means nothing to count yet (never shown as 0%). */
function PercentValue({ stats }: { stats: AttendanceSummary }) {
  const pct = formatPercent(stats.attendancePercentage);
  if (!pct) return <span className="text-xs font-medium text-[#9A9A9A] italic">{NO_ATTENDANCE_DATA_TEXT}</span>;
  return <span className={`font-semibold ${stats.belowThreshold ? 'text-red-600' : 'text-[#111111]'}`}>{pct}</span>;
}

function ThresholdFlag({ stats }: { stats: AttendanceSummary }) {
  if (stats.attendancePercentage === null) return null;
  return stats.belowThreshold ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
      <AlertTriangle className="w-3.5 h-3.5" aria-hidden /> Below {Number(stats.minimumRequiredPercentage)}%
      {stats.shortagePercentagePoints !== null && ` (short by ${Number(stats.shortagePercentagePoints)} pts)`}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> Meets minimum
    </span>
  );
}

// ---------- STUDENT ----------

function StudentAttendance() {
  const { data, isLoading, isError, error } = useMyAttendance();
  if (isLoading) return <LoadingBlock label="Loading your attendance..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load your attendance." title="Error Loading Attendance" />;
  if (data.length === 0 || data.every((s) => s.totalSessions === 0)) {
    return <Card><EmptyBlock icon={<ClipboardCheck className="w-10 h-10" />} title="No finalized attendance available yet." hint="Attendance appears once your teachers finalize sessions." /></Card>;
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-[#9A9A9A]">
        Counts include finalized sessions only. Attendance % = (Present + On Duty) ÷ (Present + Absent + On Duty); excused sessions are left out. Figures are calculated by the ERP.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.map((s) => (
          <Card key={s.subjectOfferingId} className={s.belowThreshold ? 'border-red-200' : ''}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#111111]">{s.subjectName}</h3>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">
                    <span className="font-mono">{s.subjectCode}</span> · {s.staffName} · Sem {s.semester} · {s.academicYear}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl"><PercentValue stats={s} /></div>
                  <div className="text-[11px] text-[#9A9A9A]">Minimum {Number(s.minimumRequiredPercentage)}%</div>
                </div>
              </div>
              <ThresholdFlag stats={s} />
              <dl className="grid grid-cols-5 gap-2 text-center">
                {[
                  ['Sessions', s.totalSessions], ['Present', s.present], ['Absent', s.absent], ['On Duty', s.onDuty], ['Excused', s.excused],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-[#FAFAFA] border border-[#F0F0F0] py-2">
                    <dt className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wide">{label}</dt>
                    <dd className="text-sm font-bold text-[#111111] mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- STAFF / HOD: sessions ----------

function SessionList({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const offerings = useAllSubjectOfferings();
  const sections = useSections(null, !canCreate);
  const [filters, setFilters] = useState({ offeringId: '', sectionId: '', status: '', from: '', to: '' });
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const set = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); setPage(0); };

  const { data, isLoading, isError, error, isFetching } = useAttendanceSessions({
    page,
    size: 20,
    subjectOfferingId: filters.offeringId ? Number(filters.offeringId) : undefined,
    sectionId: filters.sectionId ? Number(filters.sectionId) : undefined,
    status: (filters.status || undefined) as AttendanceSessionStatus | undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });

  return (
    <div className="space-y-4">
      <FilterBar>
        <select aria-label="Filter by subject offering" className={SELECT_CLASS} value={filters.offeringId} onChange={(e) => set({ offeringId: e.target.value })}>
          <option value="">{canCreate ? 'All My Offerings' : 'All Offerings'}</option>
          {(offerings.data ?? []).map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}</option>)}
        </select>
        {!canCreate && (
          <select aria-label="Filter by section" className={SELECT_CLASS} value={filters.sectionId} onChange={(e) => set({ sectionId: e.target.value })}>
            <option value="">All Sections</option>
            {(sections.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.batchName} — Sec {s.name}</option>)}
          </select>
        )}
        <select aria-label="Filter by status" className={SELECT_CLASS} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="FINALIZED">Finalized</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-[#666666]">From
          <input type="date" aria-label="From date" className={SELECT_CLASS} value={filters.from} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-xs text-[#666666]">To
          <input type="date" aria-label="To date" className={SELECT_CLASS} value={filters.to} onChange={(e) => set({ to: e.target.value })} />
        </label>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </FilterBar>
      {canCreate && (
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1.5" /> Create Session</Button>
      )}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {isLoading ? (
            <LoadingBlock label="Loading attendance sessions..." />
          ) : isError || !data ? (
            <ErrorBanner error={error} fallback="Unable to load attendance sessions." />
          ) : data.content.length === 0 ? (
            <Card><EmptyBlock icon={<ClipboardCheck className="w-10 h-10" />} title="No attendance sessions found." hint={canCreate ? 'Create a session to take attendance.' : undefined} /></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Section</TableHead>
                    {!canCreate && <TableHead>Faculty</TableHead>}
                    <TableHead>Topic</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.content.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(s.attendanceDate)}</TableCell>
                      <TableCell className="text-[#666666]">{s.periodNumber ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap"><span className="font-mono text-xs text-[#9A9A9A] mr-1">{s.subjectCode}</span>{s.subjectName}</TableCell>
                      <TableCell className="text-[#666666]">{s.sectionName}</TableCell>
                      {!canCreate && <TableCell className="text-[#666666] whitespace-nowrap">{s.staffName}</TableCell>}
                      <TableCell className="text-[#666666] max-w-56 truncate">{s.topic ?? '—'}</TableCell>
                      <TableCell><StatusBadge info={SESSION_STATUS_BADGE[s.status]} /></TableCell>
                      <TableCell className="text-right">
                        <Link href={ROUTES.ATTENDANCE_SESSION(s.id)} className="text-sm font-medium text-[#111111] underline-offset-2 hover:underline whitespace-nowrap">
                          {canCreate && s.status === 'DRAFT' ? 'Take Attendance' : 'View'}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination data={data} onPageChange={setPage} />
            </Card>
          )}
        </div>
        {creating && (
          <SidePanel title="Create Attendance Session" onClose={() => setCreating(false)}>
            <AttendanceSessionForm onSaved={(s) => router.push(ROUTES.ATTENDANCE_SESSION(s.id))} />
          </SidePanel>
        )}
      </div>
    </div>
  );
}

// ---------- STAFF / HOD: class summary ----------

function ClassSummary({ isHod }: { isHod: boolean }) {
  const offerings = useAllSubjectOfferings();
  const [offeringId, setOfferingId] = useState<number | null>(null);
  const [belowOnly, setBelowOnly] = useState(false);
  const summary = useClassAttendanceSummary(offeringId);

  const rows = summary.data?.students.filter((r) => !belowOnly || r.belowThreshold) ?? [];

  return (
    <div className="space-y-4">
      <FilterBar>
        <select aria-label="Subject offering" className={SELECT_CLASS} value={offeringId ?? ''} onChange={(e) => setOfferingId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Select a subject offering…</option>
          {(offerings.data ?? []).map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}{isHod ? ` — ${o.staffName}` : ''}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-[#666666]">
          <input type="checkbox" checked={belowOnly} onChange={(e) => setBelowOnly(e.target.checked)} /> Below threshold only
        </label>
        {summary.isFetching && <Spinner size="sm" />}
      </FilterBar>
      {offeringId === null ? (
        <Card><EmptyBlock icon={<ClipboardCheck className="w-10 h-10" />} title="Choose a subject offering to see its class summary." /></Card>
      ) : summary.isLoading ? (
        <LoadingBlock label="Loading class summary..." />
      ) : summary.isError || !summary.data ? (
        <ErrorBanner error={summary.error} fallback="Unable to load the class summary." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Finalized Sessions" value={summary.data.finalizedSessions} />
            <StatTile label="Enrolled Students" value={summary.data.students.length} />
            <StatTile label="Below Threshold" value={summary.data.studentsBelowThreshold} />
            <StatTile label="Minimum Required" value={`${Number(summary.data.minimumRequiredPercentage)}%`} />
          </div>
          {rows.length === 0 ? (
            <Card><EmptyBlock icon={<ClipboardCheck className="w-10 h-10" />} title={belowOnly ? 'No students are below the threshold.' : 'No enrolled students.'} /></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Register No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>On Duty</TableHead>
                    <TableHead>Excused</TableHead>
                    <TableHead>Attendance %</TableHead>
                    <TableHead>Threshold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.studentId} className={r.belowThreshold ? 'bg-red-50/50' : ''}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{r.registerNumber}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{r.studentName}</TableCell>
                      <TableCell>{r.totalSessions}</TableCell>
                      <TableCell>{r.present}</TableCell>
                      <TableCell>{r.absent}</TableCell>
                      <TableCell>{r.onDuty}</TableCell>
                      <TableCell>{r.excused}</TableCell>
                      <TableCell className="whitespace-nowrap"><PercentValue stats={r} /></TableCell>
                      <TableCell className="whitespace-nowrap"><ThresholdFlag stats={r} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StaffHodAttendance({ isHod }: { isHod: boolean }) {
  const [tab, setTab] = useState<'sessions' | 'summary'>('sessions');
  return (
    <div className="space-y-4">
      {isHod && <ReadOnlyNote>Department overview. Attendance is taken and finalized by the assigned staff member.</ReadOnlyNote>}
      <div className="inline-flex rounded-[10px] border border-[#E8E8E8] overflow-hidden" role="tablist" aria-label="Attendance views">
        {(['sessions', 'summary'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`px-4 h-9 text-sm font-medium ${tab === t ? 'bg-[#111111] text-white' : 'bg-white text-[#666666] hover:bg-[#F5F5F5]'}`}>
            {t === 'sessions' ? 'Sessions' : 'Class Summary'}
          </button>
        ))}
      </div>
      {tab === 'sessions' ? <SessionList canCreate={!isHod} /> : <ClassSummary isHod={isHod} />}
    </div>
  );
}

function AttendanceView() {
  const { hasRole } = useAuth();
  const isHod = hasRole('ROLE_HOD');
  return (
    <PageContainer rawLayout>
      {isHod || hasRole('ROLE_STAFF') ? <StaffHodAttendance isHod={isHod} /> : <StudentAttendance />}
    </PageContainer>
  );
}

export default function AttendancePage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT']}>
      <AttendanceView />
    </RequireRole>
  );
}
