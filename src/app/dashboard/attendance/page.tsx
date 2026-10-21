'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardCheck, Plus } from '@/components/ui/icons';
import { PageContainer } from '@/components/common/PageContainer';
import { TeachingSelector } from '@/components/academic/TeachingSelector';
import { useTeachingSelection } from '@/hooks/useTeachingSelection';
import { classesIn } from '@/lib/teaching-context';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, FormError, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { ReadOnlyNote, StatTile, StatusBadge } from '@/components/erp/shared';
import { AttendanceSessionForm } from '@/components/erp/AttendanceSessionForm';
import { AcademicContextFilter } from '@/components/academic/AcademicContextFilter';
import { ContextPrompt, missingContext } from '@/components/academic/ContextGate';
import { ConductedBars, InlinePercent, SubjectPercentBars } from '@/components/attendance/AttendanceCharts';
import { MonthCalendar } from '@/components/attendance/MonthCalendar';
import { monthOf, yearOf } from '@/lib/calendar';
import { useInstitutionHolidays } from '@/hooks/useHolidays';
import { DayClass, DayTimetable, UnmatchedSessions, pairSessions } from '@/components/attendance/DayTimetable';
import { useAuth } from '@/contexts/auth-context';
import { useCohortsIn } from '@/hooks/useAcademic';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import { useMyTimetable, usePeriodSchedule, useTimetableSlots } from '@/hooks/useTimetable';
import {
  useAttendanceSessions,
  useClassAttendanceSummaries,
  useMyAttendance,
  useSaveAttendanceSession,
} from '@/hooks/useAttendance';
import { AcademicContext, EMPTY_CONTEXT, matchesContext, resolveRow } from '@/lib/academic-context';
import { SELECT_CLASS, formatDate } from '@/lib/gradebook-labels';
import { NO_ATTENDANCE_DATA_TEXT, SESSION_STATUS_BADGE, dayOfDate, formatPercent, todayIso } from '@/lib/erp-labels';
import { ROUTES } from '@/constants/routes';
import { AttendanceSessionStatus, AttendanceSummary, ClassAttendanceSummary } from '@/types/attendance';
import { SubjectOffering } from '@/types/gradebook';

// Attendance is organised as Overview → Calendar / Day → Class detail. Attendance sessions still exist
// underneath (they are how faculty take attendance), but the session list is only a secondary log.

// ---------- Shared bits ----------

/** Percentage as returned by the backend; null means nothing to count yet (never shown as 0%). */
function PercentValue({ stats }: { stats: AttendanceSummary }) {
  const pct = formatPercent(stats.attendancePercentage);
  if (!pct) return <span className="text-xs font-medium text-muted italic">{NO_ATTENDANCE_DATA_TEXT}</span>;
  return <span className={`font-[550] ${stats.belowThreshold ? 'text-danger' : 'text-fg'}`}>{pct}</span>;
}

function ThresholdFlag({ stats }: { stats: AttendanceSummary }) {
  if (stats.attendancePercentage === null) return null;
  return stats.belowThreshold ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
      <AlertTriangle className="w-3.5 h-3.5" aria-hidden /> Below {Number(stats.minimumRequiredPercentage)}%
      {stats.shortagePercentagePoints !== null && ` (short by ${Number(stats.shortagePercentagePoints)} pts)`}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> Meets minimum
    </span>
  );
}

function PanelTitle({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 border-b border-line flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-[13px] font-[550] text-fg">{title}</h3>
        {hint && <p className="text-[12px] text-muted mt-0.5">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

const FORMULA_NOTE =
  'Counts include finalized classes only. Attendance % = (Present + On Duty) ÷ (Present + Absent + On Duty); excused classes are left out. Figures are calculated by the ERP.';

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ---------- Class overview (HOD: one class; STAFF: own courses) ----------

/** Per-student table of one course's class summary. Shown to HOD / faculty only. */
function StudentRows({ summary }: { summary: ClassAttendanceSummary }) {
  const [belowOnly, setBelowOnly] = useState(false);
  const rows = summary.students.filter((r) => !belowOnly || r.belowThreshold);
  return (
    <Card>
      <PanelTitle
        title="Students"
        hint="Each student's attendance in this subject, from finalized classes."
        right={
          <label className="flex items-center gap-2 text-[12px] text-muted">
            <input type="checkbox" checked={belowOnly} onChange={(e) => setBelowOnly(e.target.checked)} /> Below threshold only
          </label>
        }
      />
      {rows.length === 0 ? (
        <EmptyBlock icon={<ClipboardCheck className="w-10 h-10" />} title={belowOnly ? 'No students are below the threshold.' : 'No enrolled students.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="col-fit">Register No.</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead className="col-fit">Conducted</TableHead>
              <TableHead className="col-fit">Present</TableHead>
              <TableHead className="col-fit">Absent</TableHead>
              <TableHead className="col-fit">On Duty</TableHead>
              <TableHead className="col-fit">Excused</TableHead>
              <TableHead className="col-fit">Attendance %</TableHead>
              <TableHead>Threshold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.studentId} className={r.belowThreshold ? 'bg-danger-soft' : ''}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{r.registerNumber}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{r.studentName}</TableCell>
                <TableCell>{r.totalSessions}</TableCell>
                <TableCell>{r.present}</TableCell>
                <TableCell>{r.absent}</TableCell>
                <TableCell>{r.onDuty}</TableCell>
                <TableCell>{r.excused}</TableCell>
                <TableCell className="whitespace-nowrap"><PercentValue stats={r} /><InlinePercent percentage={r.attendancePercentage} below={r.belowThreshold} /></TableCell>
                <TableCell className="whitespace-nowrap"><ThresholdFlag stats={r} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/**
 * Subject attendance overview for a set of courses. "Overall Attendance" lists every subject; choosing a
 * subject switches the whole view to that subject. Only backend figures are shown: the backend has no
 * aggregate class attendance % yet, so no class average is calculated here.
 */
function ClassOverview({ offerings, isHod }: { offerings: SubjectOffering[]; isHod: boolean }) {
  const [choice, setChoice] = useState<number | null>(null);
  const results = useClassAttendanceSummaries(offerings.map((o) => o.id));
  const label = (o: SubjectOffering) => (isHod ? o.subjectName : `${o.subjectName} — ${o.batchName} Sec ${o.sectionName}`);
  const chosen = offerings.find((o) => o.id === choice) ?? null;

  const selector = (
    <select aria-label="Subject" className={SELECT_CLASS} value={choice ?? ''} onChange={(e) => setChoice(e.target.value ? Number(e.target.value) : null)}>
      <option value="">Overall Attendance</option>
      {offerings.map((o) => <option key={o.id} value={o.id}>{label(o)} ({o.subjectCode})</option>)}
    </select>
  );

  if (offerings.length === 0) {
    return <Card><EmptyBlock icon={<ClipboardCheck className="w-10 h-10" />} title={isHod ? 'No courses are assigned to this class yet.' : 'You have no active courses.'} /></Card>;
  }

  let body;
  if (chosen) {
    const q = results[offerings.indexOf(chosen)];
    if (q.isLoading) body = <LoadingBlock label="Loading attendance..." />;
    else if (q.isError || !q.data) body = <ErrorBanner error={q.error} fallback="Unable to load attendance for this subject." />;
    else {
      const s = q.data;
      body = (
        <div className="space-y-4">
          {isHod && <p className="text-[12px] text-muted">Faculty: <span className="text-fg">{chosen.staffName}</span></p>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Classes Conducted" value={s.finalizedSessions} hint="Finalized classes" />
            <StatTile label="Total Students" value={s.students.length} />
            <StatTile label="Below Threshold" value={s.studentsBelowThreshold} hint={`Under ${Number(s.minimumRequiredPercentage)}%`} />
            <StatTile label="Minimum Required" value={`${Number(s.minimumRequiredPercentage)}%`} />
          </div>
          <StudentRows summary={s} />
        </div>
      );
    }
  } else {
    const loading = results.some((r) => r.isLoading);
    const failed = results.find((r) => r.isError);
    const loaded = offerings.map((o, i) => ({ o, s: results[i].data })).filter((x): x is { o: SubjectOffering; s: ClassAttendanceSummary } => !!x.s);
    body = loading ? <LoadingBlock label="Loading attendance..." /> : (
      <div className="space-y-4">
        {failed && <ErrorBanner error={failed.error} fallback="Some subjects could not be loaded." />}
        <ReadOnlyNote>
          Class attendance % is not shown yet — the ERP does not provide an aggregate class figure. Choose a subject to see each student&apos;s percentage.
        </ReadOnlyNote>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <Card>
            <PanelTitle title="Classes conducted" hint="Finalized classes per subject." />
            <ConductedBars rows={loaded.map(({ o, s }) => ({ key: o.id, label: label(o), sublabel: o.subjectCode, total: s.finalizedSessions }))} />
          </Card>
          <Card>
            <PanelTitle title="Class summary by subject" hint="Students below the minimum attendance. Average attendance % appears once the ERP provides it." />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead className="col-fit text-right">Below Threshold</TableHead>
                  <TableHead className="col-fit text-right">Total Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loaded.map(({ o, s }) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setChoice(o.id)}>
                    <TableCell>
                      <div className="font-medium">{label(o)}</div>
                      <div className="text-[11px] text-muted"><span className="font-mono">{o.subjectCode}</span>{isHod && ` · ${o.staffName}`}</div>
                    </TableCell>
                    <TableCell className={`text-right ${s.studentsBelowThreshold > 0 ? 'text-danger font-[550]' : ''}`}>{s.studentsBelowThreshold}</TableCell>
                    <TableCell className="text-right">{s.students.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">{selector}{results.some((r) => r.isFetching) && <Spinner size="sm" />}</div>
      {body}
    </div>
  );
}

// ---------- Student overview ----------

function StudentOverview() {
  const { data, isLoading, isError, error } = useMyAttendance();
  const [choice, setChoice] = useState<number | null>(null);
  if (isLoading) return <LoadingBlock label="Loading your attendance..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load your attendance." title="Error Loading Attendance" />;
  if (data.length === 0) {
    return <Card><EmptyBlock icon={<ClipboardCheck className="w-10 h-10" />} title="No attendance available yet." hint="Attendance appears once your teachers finalize classes." /></Card>;
  }
  const chosen = data.find((s) => s.subjectOfferingId === choice) ?? null;
  const list = chosen ? [chosen] : data;
  // Plain sums of the backend's per-subject counts; no overall percentage is derived here.
  const sum = (k: 'totalSessions' | 'present' | 'absent' | 'onDuty' | 'excused') => list.reduce((n, s) => n + s[k], 0);

  return (
    <div className="space-y-4">
      <select aria-label="Subject" className={SELECT_CLASS} value={choice ?? ''} onChange={(e) => setChoice(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Overall Attendance</option>
        {data.map((s) => <option key={s.subjectOfferingId} value={s.subjectOfferingId}>{s.subjectName} ({s.subjectCode})</option>)}
      </select>
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${chosen ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3`}>
        {chosen && <StatTile label="Attendance %" value={<PercentValue stats={chosen} />} hint={`Minimum ${Number(chosen.minimumRequiredPercentage)}%`} />}
        <StatTile label="Classes Conducted" value={sum('totalSessions')} hint={chosen ? 'Finalized classes' : 'All subjects'} />
        <StatTile label="Present" value={sum('present')} />
        <StatTile label="Absent" value={sum('absent')} />
        <StatTile label="On Duty" value={sum('onDuty')} />
        <StatTile label="Excused" value={sum('excused')} />
      </div>
      {chosen && <ThresholdFlag stats={chosen} />}
      <p className="text-xs text-muted">{FORMULA_NOTE}</p>
      <div className={`grid grid-cols-1 ${chosen ? '' : 'xl:grid-cols-2'} gap-4 items-start`}>
        {!chosen && (
          <Card>
            <PanelTitle title="Attendance by subject" hint="Tick = minimum required. Choose a subject for its details." />
            <SubjectPercentBars
              rows={data.map((s) => ({
                key: s.subjectOfferingId, name: s.subjectName, code: s.subjectCode, percentage: s.attendancePercentage,
                belowThreshold: s.belowThreshold, minimum: Number(s.minimumRequiredPercentage),
              }))}
              onSelect={(key) => setChoice(Number(key))}
            />
          </Card>
        )}
        <Card>
          <PanelTitle title="Classes conducted vs attended" hint={chosen ? `${chosen.subjectName} · ${chosen.staffName}` : 'Per subject.'} />
          <ConductedBars rows={list.map((s) => ({ key: s.subjectOfferingId, label: s.subjectName, sublabel: s.subjectCode, total: s.totalSessions, attended: s.attended }))} />
        </Card>
      </div>
    </div>
  );
}

// ---------- Calendar / day view ----------

type CalendarRole = 'HOD' | 'STAFF' | 'STUDENT';

/** Faculty: start attendance for a class with no session yet. Creates the session, then opens it. */
function StartAttendance({ c, date }: { c: DayClass; date: string }) {
  const router = useRouter();
  const save = useSaveAttendanceSession();
  const [topic, setTopic] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(
          { payload: { subjectOfferingId: c.slot.subjectOfferingId, attendanceDate: date, timetableSlotId: c.slot.id, periodNumber: c.slot.periodNumber, topic: topic.trim() || null } },
          { onSuccess: (s) => router.push(ROUTES.ATTENDANCE_SESSION(s.id)) },
        );
      }}
    >
      <p className="text-[12px] text-muted">No attendance has been taken for this class yet.</p>
      <div className="space-y-1.5">
        <label htmlFor="start-topic" className="f-label">Topic (optional)</label>
        <Input id="start-topic" maxLength={255} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </div>
      {save.isError && <FormError error={save.error} fallback="Unable to start attendance." />}
      <Button type="submit" size="sm" isLoading={save.isPending}>Take Attendance</Button>
    </form>
  );
}

/** What opens under the day list when a class without a direct destination is clicked. */
function ClassDetail({ role, c, date }: { role: CalendarRole; c: DayClass; date: string }) {
  const mine = useMyAttendance(role === 'STUDENT');
  let content;
  if (role === 'STUDENT') {
    const subject = mine.data?.find((s) => s.subjectOfferingId === c.slot.subjectOfferingId);
    content = (
      <div className="space-y-2">
        <p className="text-[12px] text-muted">Your attendance for a single class is not available yet. Your figures for this subject:</p>
        {mine.isLoading ? <Spinner size="sm" /> : subject ? (
          <p className="text-[13px] text-fg">
            <PercentValue stats={subject} /> · {subject.attended} attended of {subject.totalSessions} conducted
          </p>
        ) : <p className="text-[12px] text-muted">No finalized classes in this subject yet.</p>}
      </div>
    );
  } else if (role === 'HOD') {
    content = <p className="text-[12px] text-muted">No attendance has been recorded for this class on this date. Attendance is taken by {c.slot.staffName}.</p>;
  } else if (date > todayIso()) {
    content = <p className="text-[12px] text-muted">Attendance can be taken on the day of the class or later.</p>;
  } else {
    content = <StartAttendance key={`${c.slot.id}-${date}`} c={c} date={date} />;
  }
  return (
    <div className="border-t border-line px-5 py-4 bg-soft/40">
      <p className="text-[13px] font-[550] text-fg mb-2">{c.slot.subjectName} <span className="font-mono text-[11px] text-muted">{c.slot.subjectCode}</span></p>
      {content}
    </div>
  );
}

/**
 * Month calendar → day timetable → class. HOD sees the chosen class's timetable (read-only); faculty see
 * only their own classes; students see their own section's classes.
 */
function AttendanceCalendar({ role, ctx }: { role: CalendarRole; ctx?: AcademicContext }) {
  const router = useRouter();
  const [month, setMonth] = useState(monthOf(todayIso()));
  const [date, setDate] = useState(todayIso());
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const periods = usePeriodSchedule();
  const hodSlots = useTimetableSlots(
    { batchId: ctx?.batchId ?? undefined, semester: ctx?.semester ?? undefined, sectionId: ctx?.sectionId ?? undefined },
    role === 'HOD',
  );
  const mySlots = useMyTimetable(role !== 'HOD');
  const slotsQuery = role === 'HOD' ? hodSlots : mySlots;
  const slots = useMemo(
    () => (slotsQuery.data ?? []).filter((s) => s.active && (role !== 'HOD' || s.semester === ctx?.semester)),
    [slotsQuery.data, role, ctx?.semester],
  );
  const classDays = useMemo(() => new Set(slots.map((s) => s.dayOfWeek)), [slots]);
  const daySlots = slots.filter((s) => s.dayOfWeek === dayOfDate(date));

  const sessions = useAttendanceSessions(
    { page: 0, size: 100, sectionId: role === 'HOD' ? ctx?.sectionId ?? undefined : undefined, from: date, to: date },
    role !== 'STUDENT',
  );
  const { classes, unmatched } = pairSessions(daySlots, sessions.data?.content ?? []);
  const open = classes.find((c) => c.slot.id === openSlot) ?? null;

  const onOpen = (c: DayClass) => {
    if (role !== 'STUDENT' && c.session) return router.push(ROUTES.ATTENDANCE_SESSION(c.session.id));
    setOpenSlot(c.slot.id === openSlot ? null : c.slot.id);
  };
  const pick = (d: string) => { setDate(d); setOpenSlot(null); };
  // Institution holidays are shown for information only; they don't change the classes listed.
  const monthHolidays = useInstitutionHolidays(yearOf(month));
  const dateHolidays = useInstitutionHolidays(yearOf(date));
  const holidaysOnDate = dateHolidays.data?.effectiveByDate.get(date) ?? [];

  let day;
  if (slotsQuery.isLoading || periods.isLoading) day = <LoadingBlock label="Loading timetable..." />;
  else if (slotsQuery.isError || periods.isError) day = <ErrorBanner error={slotsQuery.error ?? periods.error} fallback="Unable to load the timetable." />;
  else if (daySlots.length === 0 && unmatched.length === 0) day = <EmptyBlock icon={<CalendarDays className="w-10 h-10" />} title="No classes scheduled on this day." />;
  else {
    day = (
      <>
        {sessions.isError && <div className="p-4"><ErrorBanner error={sessions.error} fallback="Unable to load attendance for this day." /></div>}
        <DayTimetable
          schedule={periods.data ?? []}
          classes={classes}
          showFaculty={role !== 'STAFF'}
          showClass={role === 'STAFF'}
          showStatus={role !== 'STUDENT' && !sessions.isLoading}
          activeSlotId={openSlot}
          onOpen={onOpen}
        />
        {open && <ClassDetail role={role} c={open} date={date} />}
        {role !== 'STUDENT' && (
          <UnmatchedSessions sessions={unmatched} showFaculty={role === 'HOD'} onOpen={(s) => router.push(ROUTES.ATTENDANCE_SESSION(s.id))} />
        )}
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,360px)_1fr] gap-4 items-start">
      <Card>
        <MonthCalendar month={month} onMonthChange={setMonth} selected={date} onSelect={pick} classDays={classDays}
          holidays={monthHolidays.data} holidaysLoading={monthHolidays.isLoading} holidaysError={monthHolidays.isError} />
      </Card>
      <Card>
        <PanelTitle
          title={longDate(date)}
          hint={
            role === 'HOD' ? 'This class’s timetable for the day. Click a class to open its attendance.'
              : role === 'STAFF' ? 'Your classes on this day. Click a class to take or open its attendance.'
                : 'Your classes on this day.'
          }
          right={sessions.isFetching ? <Spinner size="sm" /> : undefined}
        />
        {holidaysOnDate.length > 0 && (
          <div className="mx-5 my-3 rounded-[10px] bg-warn-soft text-warn px-3 py-2 text-[12.5px]" role="status">
            College holiday: {holidaysOnDate.map((h) => h.name).join(', ')}
          </div>
        )}
        {day}
      </Card>
    </div>
  );
}

// ---------- Session log (secondary) ----------

function SessionTable({ query, showFaculty, canTake, onPage }: {
  query: ReturnType<typeof useAttendanceSessions>; showFaculty: boolean; canTake: boolean; onPage: (page: number) => void;
}) {
  const { data, isLoading, isError, error } = query;
  if (isLoading) return <LoadingBlock label="Loading attendance sessions..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load attendance sessions." />;
  if (data.content.length === 0) return <Card><EmptyBlock icon={<ClipboardCheck className="w-10 h-10" />} title="No attendance sessions found." /></Card>;
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="col-fit">Date</TableHead>
            <TableHead className="col-fit">Period</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead className="col-fit">Section</TableHead>
            {showFaculty && <TableHead>Faculty</TableHead>}
            <TableHead>Topic</TableHead>
            <TableHead className="col-fit">Status</TableHead>
            <TableHead className="col-fit text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.content.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="whitespace-nowrap">{formatDate(s.attendanceDate)}</TableCell>
              <TableCell className="text-muted">{s.periodNumber ?? '—'}</TableCell>
              <TableCell className="whitespace-nowrap"><span className="font-mono text-xs text-muted mr-1">{s.subjectCode}</span>{s.subjectName}</TableCell>
              <TableCell className="text-muted">{s.sectionName}</TableCell>
              {showFaculty && <TableCell className="text-muted whitespace-nowrap">{s.staffName}</TableCell>}
              <TableCell className="text-muted max-w-56 truncate">{s.topic ?? '—'}</TableCell>
              <TableCell><StatusBadge info={SESSION_STATUS_BADGE[s.status]} /></TableCell>
              <TableCell className="text-right">
                <Link href={ROUTES.ATTENDANCE_SESSION(s.id)} className="text-sm font-medium text-fg underline-offset-2 hover:underline whitespace-nowrap">
                  {canTake && s.status === 'DRAFT' ? 'Take Attendance' : 'View'}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination data={data} onPageChange={onPage} />
    </Card>
  );
}

/** Status and date-range filters shared by both session logs. */
function useSessionFilters() {
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });
  const [page, setPage] = useState(0);
  const set = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); setPage(0); };
  const controls = (
    <>
      <select aria-label="Filter by status" className={SELECT_CLASS} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
        <option value="">All Statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="FINALIZED">Finalized</option>
      </select>
      <label className="flex items-center gap-2 text-xs text-muted">From
        <input type="date" aria-label="From date" className={SELECT_CLASS} value={filters.from} onChange={(e) => set({ from: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-xs text-muted">To
        <input type="date" aria-label="To date" className={SELECT_CLASS} value={filters.to} onChange={(e) => set({ to: e.target.value })} />
      </label>
    </>
  );
  const params = {
    page, size: 20,
    status: (filters.status || undefined) as AttendanceSessionStatus | undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
  return { controls, params, setPage };
}

/** HOD: the chosen class's sessions (read-only). */
function HodSessionLog({ sectionId, offerings }: { sectionId: number; offerings: SubjectOffering[] }) {
  const [offeringId, setOfferingId] = useState('');
  const { controls, params, setPage } = useSessionFilters();
  const query = useAttendanceSessions({ ...params, sectionId: offeringId ? undefined : sectionId, subjectOfferingId: offeringId ? Number(offeringId) : undefined });
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <select aria-label="Subject" className={SELECT_CLASS} value={offeringId} onChange={(e) => { setOfferingId(e.target.value); setPage(0); }}>
          <option value="">All subjects</option>
          {offerings.map((o) => <option key={o.id} value={o.id}>{o.subjectName} ({o.subjectCode})</option>)}
        </select>
        {controls}
        {query.isFetching && !query.isLoading && <Spinner size="sm" />}
      </div>
      <SessionTable query={query} showFaculty canTake={false} onPage={setPage} />
    </div>
  );
}

/**
 * Faculty: own sessions, plus Create Session for classes outside the calendar flow. The class comes from the
 * Batch → Semester → Class selector above; with "All my classes" every session of theirs is listed (the
 * sessions API has no batch / semester filter).
 */
function StaffSessionLog({ offeringId }: { offeringId: number | null }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const { controls, params, setPage } = useSessionFilters();
  const query = useAttendanceSessions({ ...params, subjectOfferingId: offeringId ?? undefined });
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        {controls}
        {query.isFetching && !query.isLoading && <Spinner size="sm" />}
        <Button size="sm" className="sm:ml-auto" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> Create Session</Button>
      </div>
      <SessionTable query={query} showFaculty={false} canTake onPage={setPage} />
      {creating && (
        <SidePanel title="Create Attendance Session" onClose={() => setCreating(false)}>
          <AttendanceSessionForm onSaved={(s) => router.push(ROUTES.ATTENDANCE_SESSION(s.id))} />
        </SidePanel>
      )}
    </div>
  );
}

// ---------- Role views ----------

type HodTab = 'overview' | 'calendar' | 'log';

function HodAttendance() {
  const offerings = useAllSubjectOfferings();
  const cohorts = useCohortsIn(offerings.data);
  const [ctx, setCtx] = useState<AcademicContext>(EMPTY_CONTEXT);
  const [tab, setTab] = useState<HodTab>('overview');
  const all = useMemo(() => offerings.data ?? [], [offerings.data]);
  const prompt = missingContext(ctx, 'section');

  // One course per subject in the chosen class (the active / latest record when there are several).
  const classOfferings = useMemo(() => {
    if (prompt) return [];
    const inClass = all.filter((o) => matchesContext(o, { ...ctx, subjectId: null }));
    const subjectIds = [...new Set(inClass.map((o) => o.subjectId))];
    return subjectIds
      .map((subjectId) => resolveRow(inClass, { ...ctx, subjectId }))
      .filter((o): o is SubjectOffering => !!o)
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [all, ctx, prompt]);
  const classKey = `${ctx.batchId}-${ctx.semester}-${ctx.sectionId}`;

  let body;
  if (offerings.isError) body = <ErrorBanner error={offerings.error} fallback="Unable to load classes." />;
  else if (prompt) {
    body = <ContextPrompt icon={<ClipboardCheck className="w-10 h-10" />} title={ctx.batchId === null ? 'Select a cohort to view attendance.' : prompt} />;
  } else {
    body = (
      <div className="space-y-4">
        <Tabs label="Attendance views" value={tab} onChange={setTab}
          items={[{ value: 'overview', label: 'Overview' }, { value: 'calendar', label: 'Calendar' }, { value: 'log', label: 'Session Log' }] as const} />
        {tab === 'overview' && <ClassOverview key={classKey} offerings={classOfferings} isHod />}
        {tab === 'calendar' && <AttendanceCalendar key={classKey} role="HOD" ctx={ctx} />}
        {tab === 'log' && <HodSessionLog key={classKey} sectionId={ctx.sectionId as number} offerings={classOfferings} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AcademicContextFilter rows={all} value={ctx} onChange={setCtx} cohorts={cohorts} levels={['cohort', 'semester', 'section']}
        mode="picker" idPrefix="attendance" disabled={offerings.isLoading} />
      <ReadOnlyNote>Read-only. Attendance is taken and finalized by the assigned faculty member.</ReadOnlyNote>
      {body}
    </div>
  );
}

function StaffAttendance() {
  const { rows, batches, selection, setSelection, isLoading, isError, error } = useTeachingSelection();
  const [tab, setTab] = useState<HodTab>('calendar');
  // Classes of the chosen batch + semester (past semesters included, so history stays reachable).
  const mine = useMemo(() => {
    const inPeriod = classesIn(rows, selection);
    return selection.offeringId === null ? inPeriod : inPeriod.filter((o) => o.id === selection.offeringId);
  }, [rows, selection]);
  return (
    <div className="space-y-4">
      <Tabs label="Attendance views" value={tab} onChange={setTab}
        items={[{ value: 'calendar', label: 'My Classes' }, { value: 'overview', label: 'Overview' }, { value: 'log', label: 'Session Log' }] as const} />
      {/* The day calendar follows the timetable; Batch → Semester → Class applies to Overview and Session Log. */}
      {tab !== 'calendar' && (
        <TeachingSelector rows={rows} batches={batches} value={selection} onChange={setSelection} idPrefix="attendance" disabled={isLoading} />
      )}
      {tab === 'overview' && (isLoading ? <LoadingBlock label="Loading your courses..." />
        : isError ? <ErrorBanner error={error} fallback="Unable to load your courses." />
          : <ClassOverview offerings={mine} isHod={false} />)}
      {tab === 'calendar' && <AttendanceCalendar role="STAFF" />}
      {tab === 'log' && <StaffSessionLog offeringId={selection.offeringId} />}
    </div>
  );
}

function StudentAttendance() {
  const [tab, setTab] = useState<'overview' | 'calendar'>('overview');
  return (
    <div className="space-y-4">
      <Tabs label="Attendance views" value={tab} onChange={setTab}
        items={[{ value: 'overview', label: 'Overview' }, { value: 'calendar', label: 'Calendar' }] as const} />
      {tab === 'overview' ? <StudentOverview /> : <AttendanceCalendar role="STUDENT" />}
    </div>
  );
}

function AttendanceView() {
  const { hasRole } = useAuth();
  return (
    <PageContainer rawLayout>
      {hasRole('ROLE_HOD') ? <HodAttendance /> : hasRole('ROLE_STAFF') ? (
        <Suspense fallback={<LoadingBlock label="Loading..." />}><StaffAttendance /></Suspense>
      ) : <StudentAttendance />}
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
