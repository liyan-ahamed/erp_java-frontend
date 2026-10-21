'use client';

import Link from 'next/link';
import { PageContainer } from '@/components/common/PageContainer';
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard';
import { Badge } from '@/components/ui/Badge';
import { CalendarDays, ClipboardCheck, ClipboardList, Clock } from '@/components/ui/icons';
import { EmptyBlock, ErrorBanner, LoadingBlock } from '@/components/gradebook/shared';
import { dashboardGreeting } from '@/components/dashboard/greeting';
import { useAuth } from '@/contexts/auth-context';
import { useMyTimetable } from '@/hooks/useTimetable';
import { useAttendanceSessions } from '@/hooks/useAttendance';
import { useInstitutionHolidays } from '@/hooks/useHolidays';
import { appliesToCohort } from '@/lib/holidays';
import { formatDate } from '@/lib/gradebook-labels';
import { DAYS, SLOT_TYPE_LABELS, dayOfDate, formatTime, todayIso } from '@/lib/erp-labels';
import { ROUTES } from '@/constants/routes';
import { TimetableSlot } from '@/types/timetable';

const UPCOMING_LIMIT = 6;
const LOOKAHEAD_DAYS = 7;

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Upcoming = { date: string; slot: TimetableSlot };

/**
 * The faculty member's next classes, from their own weekly timetable (/timetable/me), starting now and
 * looking a week ahead. Classes that already ended today are skipped, and so are classes on a published
 * college holiday that applies to the class's cohort (`isHoliday`). Holidays are whole days; partial-day
 * holidays aren't modelled.
 */
const upcomingClasses = (slots: TimetableSlot[], isHoliday: (date: string, batchId: number) => boolean): { list: Upcoming[]; skipped: number } => {
  const now = new Date();
  const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const out: Upcoming[] = [];
  let skipped = 0;
  for (let i = 0; i < LOOKAHEAD_DAYS && out.length < UPCOMING_LIMIT; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const date = isoOf(day);
    const dow = dayOfDate(date);
    slots
      .filter((s) => s.dayOfWeek === dow && (i > 0 || formatTime(s.endTime) > nowTime))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .forEach((slot) => (isHoliday(date, slot.batchId) ? skipped++ : out.push({ date, slot })));
  }
  return { list: out.slice(0, UPCOMING_LIMIT), skipped };
};

const dayLabel = (date: string) => {
  const today = todayIso();
  const tomorrow = isoOf(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1));
  if (date === today) return 'Today';
  if (date === tomorrow) return 'Tomorrow';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

function Panel({ title, hint, right, children }: { title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {hint && <p>{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/**
 * STAFF dashboard: only the signed-in faculty member's own teaching work — today's and upcoming classes
 * and things to complete. No department-wide counts. Reminders are never invented: marks-entry tasks wait
 * for the backend, and only real draft attendance sessions are listed.
 */
export function StaffDashboard() {
  const { user } = useAuth();
  const timetable = useMyTimetable();
  const drafts = useAttendanceSessions({ page: 0, size: 5, status: 'DRAFT' });

  const slots = (timetable.data ?? []).filter((s) => s.active);
  const todayDow = dayOfDate(todayIso());
  const todays = slots.filter((s) => s.dayOfWeek === todayDow);
  // Published college holidays of every year the 7-day window touches. A failed load is never read as
  // "no holidays": the list then says the holidays couldn't be checked.
  const now = new Date();
  const startYear = now.getFullYear();
  const endYear = new Date(now.getFullYear(), now.getMonth(), now.getDate() + LOOKAHEAD_DAYS - 1).getFullYear();
  const holidaysA = useInstitutionHolidays(startYear);
  const holidaysB = useInstitutionHolidays(endYear, endYear !== startYear);
  const holidayQueries = endYear !== startYear ? [holidaysA, holidaysB] : [holidaysA];
  const holidaysFailed = holidayQueries.some((q) => q.isError);
  const isHoliday = (date: string, batchId: number) =>
    holidayQueries.some((q) => (q.data?.effectiveByDate.get(date) ?? []).some((h) => appliesToCohort(h, batchId)));
  const { list: upcoming, skipped } = upcomingClasses(slots, isHoliday);
  const teachingDays = DAYS.filter((d) => slots.some((s) => s.dayOfWeek === d)).length;

  return (
    <PageContainer eyebrow="Your teaching, at a glance" title={dashboardGreeting(user?.name)} description="Your classes and the work waiting for you.">
      <MetricGrid>
        <MetricCard title="Today's Classes" value={timetable.isLoading ? '…' : todays.length} icon={<CalendarDays />}
          subtitle={todays.length ? `First at ${formatTime([...todays].sort((a, b) => a.startTime.localeCompare(b.startTime))[0].startTime)}` : 'No classes today'} href={ROUTES.ATTENDANCE} />
        <MetricCard title="Weekly Classes" value={timetable.isLoading ? '…' : slots.length} icon={<Clock />}
          subtitle={`Across ${teachingDays} day${teachingDays === 1 ? '' : 's'}`} href={ROUTES.TIMETABLE} />
        <MetricCard title="Attendance to Finalize" value={drafts.isLoading ? '…' : drafts.data?.totalElements ?? '—'} icon={<ClipboardCheck />}
          subtitle="Draft attendance sessions" href={ROUTES.ATTENDANCE} />
        <MetricCard title="Pending Marks Entry" value="—" icon={<ClipboardList />} subtitle="Not tracked by the ERP yet" />
      </MetricGrid>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] items-start gap-[21px]">
        <Panel title="Upcoming Classes" hint="Your next classes from your timetable." right={<Link href={ROUTES.TIMETABLE} className="text-[12px] text-accent hover:underline">My timetable</Link>}>
          {(holidaysFailed || skipped > 0) && !timetable.isLoading && (
            <p className={`px-[21px] pb-2 text-[12px] ${holidaysFailed ? 'text-warn' : 'text-muted'}`} role="status">
              {holidaysFailed
                ? 'College holidays could not be checked, so some of these classes may fall on a holiday.'
                : `${skipped} ${skipped === 1 ? 'class falls' : 'classes fall'} on a college holiday this week and ${skipped === 1 ? 'is' : 'are'} not listed.`}
            </p>
          )}
          {timetable.isLoading || holidayQueries.some((q) => q.isLoading) ? (
            <LoadingBlock label="Loading your timetable…" />
          ) : timetable.isError ? (
            <div className="p-4"><ErrorBanner error={timetable.error} fallback="Unable to load your timetable." /></div>
          ) : upcoming.length === 0 ? (
            <EmptyBlock icon={<CalendarDays />} title={slots.length ? 'No more classes in the next 7 days.' : 'No classes are scheduled for you yet.'} />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {upcoming.map(({ date, slot }) => (
                <li key={`${date}-${slot.id}`}>
                  <Link href={ROUTES.ATTENDANCE} className="flex items-center gap-3 px-[21px] py-3 hover:bg-soft transition-colors">
                    <span className="w-[86px] shrink-0">
                      <span className={`block text-[12px] font-[550] ${date === todayIso() ? 'text-accent' : 'text-fg'}`}>{dayLabel(date)}</span>
                      <span className="block text-[11.5px] text-muted tabular-nums">{formatTime(slot.startTime)}–{formatTime(slot.endTime)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-[550] text-fg truncate">{slot.subjectName}</span>
                      <span className="block text-[11.5px] text-muted truncate">
                        {slot.batchName} · Section {slot.sectionName}{slot.room ? ` · Room ${slot.room}` : ''}
                      </span>
                    </span>
                    {slot.slotType !== 'LECTURE' && <Badge variant="outline">{SLOT_TYPE_LABELS[slot.slotType]}</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Things to Complete" hint="Teaching tasks for your classes.">
          <div className="border-t border-line">
            <div className="px-[21px] pt-3 pb-1 text-[11px] text-muted uppercase tracking-wide">Attendance to finalize</div>
            {drafts.isLoading ? (
              <LoadingBlock label="Loading…" />
            ) : drafts.isError ? (
              <div className="p-4"><ErrorBanner error={drafts.error} fallback="Unable to load your attendance sessions." /></div>
            ) : (drafts.data?.content.length ?? 0) === 0 ? (
              <p className="px-[21px] pb-3 text-[12.5px] text-muted">All your attendance sessions are finalized.</p>
            ) : (
              <ul className="divide-y divide-line">
                {drafts.data?.content.map((s) => (
                  <li key={s.id} className="px-[21px] py-3 flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-fg">Attendance not finalized</span>
                      <span className="block text-[11.5px] text-muted truncate">{s.subjectName} — Section {s.sectionName} · {formatDate(s.attendanceDate)}</span>
                    </span>
                    <Link href={ROUTES.ATTENDANCE_SESSION(s.id)} className="f-btn !h-8 !px-3 text-[12px] shrink-0">Open</Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-[21px] pt-3 pb-1 text-[11px] text-muted uppercase tracking-wide border-t border-line">Marks entry</div>
            <p className="px-[21px] pb-4 text-[12.5px] text-muted">
              Marks-entry reminders (CAT 1, CAT 2, assignments, practicals, results) will appear here once the ERP tracks marks-entry deadlines.
            </p>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
