import { Badge } from '@/components/ui/Badge';
import { ChevronRight } from '@/components/ui/icons';
import { Schedule } from '@/lib/academic-periods';
import { SESSION_STATUS_BADGE, SLOT_TYPE_LABELS, formatTime } from '@/lib/erp-labels';
import { AttendanceSession } from '@/types/attendance';
import { TimetableSlot } from '@/types/timetable';

export interface DayClass {
  slot: TimetableSlot;
  /** The attendance session recorded for this class on this date, if any. */
  session: AttendanceSession | null;
}

/**
 * Pairs a day's timetable slots with the attendance sessions recorded that date: first by the session's
 * timetable slot, then by course + period, then by course when that course has exactly one class that day.
 * Sessions that match no slot are returned in `unmatched`, so recorded attendance is never hidden.
 */
export const pairSessions = (slots: TimetableSlot[], sessions: AttendanceSession[]): { classes: DayClass[]; unmatched: AttendanceSession[] } => {
  const used = new Set<number>();
  const take = (s: AttendanceSession | undefined) => { if (s) used.add(s.id); return s ?? null; };
  const byStart = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const pass1 = byStart.map((slot) => ({ slot, session: take(sessions.find((s) => s.timetableSlotId === slot.id)) }));
  const pass2 = pass1.map((c) =>
    c.session ? c : { ...c, session: take(sessions.find((s) => !used.has(s.id) && s.timetableSlotId === null && s.subjectOfferingId === c.slot.subjectOfferingId && s.periodNumber !== null && s.periodNumber === c.slot.periodNumber)) },
  );
  const classes = pass2.map((c) => {
    if (c.session) return c;
    const sameCourse = slots.filter((x) => x.subjectOfferingId === c.slot.subjectOfferingId);
    const left = sessions.filter((s) => !used.has(s.id) && s.timetableSlotId === null && s.subjectOfferingId === c.slot.subjectOfferingId);
    return sameCourse.length === 1 && left.length === 1 ? { ...c, session: take(left[0]) } : c;
  });
  return { classes, unmatched: sessions.filter((s) => !used.has(s.id)) };
};

/** Attendance recorded on the day for classes that aren't in that day's timetable. */
export function UnmatchedSessions({ sessions, showFaculty, onOpen }: { sessions: AttendanceSession[]; showFaculty?: boolean; onOpen: (s: AttendanceSession) => void }) {
  if (sessions.length === 0) return null;
  return (
    <div className="border-t border-line">
      <div className="px-5 pt-3 pb-1 text-[11px] text-muted uppercase tracking-wide">Other attendance recorded on this day</div>
      <ul className="divide-y divide-line">
        {sessions.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onOpen(s)} className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-soft transition-colors">
              <span className="w-[92px] shrink-0 text-[12px] text-muted">{s.periodNumber !== null ? `Period ${s.periodNumber}` : 'No period'}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-[550] text-fg">{s.subjectName}</span>
                <span className="block text-[11.5px] text-muted truncate">
                  <span className="font-mono">{s.subjectCode}</span> · Section {s.sectionName}{showFaculty && ` · ${s.staffName}`}{s.topic && ` · ${s.topic}`}
                </span>
              </span>
              <Badge variant={SESSION_STATUS_BADGE[s.status].variant}>{SESSION_STATUS_BADGE[s.status].label}</Badge>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DayTimetableProps {
  schedule: Schedule;
  classes: DayClass[];
  /** Show the faculty name (HOD, student). */
  showFaculty?: boolean;
  /** Show the class (faculty's own day, which may span sections). */
  showClass?: boolean;
  /** Show whether attendance was recorded (HOD / faculty). Students never see session states. */
  showStatus?: boolean;
  activeSlotId?: number | null;
  onOpen: (c: DayClass) => void;
}

/** A day's classes in time order, with Break and Lunch as separate non-teaching rows. */
export function DayTimetable({ schedule, classes, showFaculty, showClass, showStatus, activeSlotId, onOpen }: DayTimetableProps) {
  type Row = { kind: 'class'; start: string; c: DayClass } | { kind: 'pause'; start: string; label: string; end: string };
  const rows: Row[] = [
    ...classes.map((c): Row => ({ kind: 'class', start: formatTime(c.slot.startTime), c })),
    ...schedule.filter((r) => r.kind !== 'period').map((r): Row => ({ kind: 'pause', start: r.start, label: r.label, end: r.end })),
  ].sort((a, b) => a.start.localeCompare(b.start) || (a.kind === 'pause' ? -1 : 1));

  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => {
        if (row.kind === 'pause') {
          return (
            <li key={`pause-${row.label}`} className="px-5 py-1.5 bg-soft text-[11px] text-muted uppercase tracking-wide">
              {row.label} · {row.start}–{row.end}
            </li>
          );
        }
        const { slot, session } = row.c;
        const active = activeSlotId === slot.id;
        return (
          <li key={slot.id}>
            <button
              type="button"
              onClick={() => onOpen(row.c)}
              aria-pressed={active}
              className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-colors ${active ? 'bg-accent-soft' : 'hover:bg-soft'}`}
            >
              <span className="w-[92px] shrink-0 text-[12px] text-muted tabular-nums">
                {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                {slot.periodNumber !== null && <span className="block text-[11px]">Period {slot.periodNumber}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-[550] text-fg">{slot.subjectName}</span>
                <span className="block text-[11.5px] text-muted truncate">
                  <span className="font-mono">{slot.subjectCode}</span>
                  {showFaculty && ` · ${slot.staffName}`}
                  {showClass && ` · ${slot.batchName} Sec ${slot.sectionName}`}
                  {slot.room && ` · Room ${slot.room}`}
                  {slot.slotType !== 'LECTURE' && ` · ${SLOT_TYPE_LABELS[slot.slotType]}`}
                </span>
              </span>
              {showStatus && (
                session
                  ? <Badge variant={SESSION_STATUS_BADGE[session.status].variant}>{SESSION_STATUS_BADGE[session.status].label}</Badge>
                  : <Badge variant="default">Not recorded</Badge>
              )}
              <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
