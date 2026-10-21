import { PeriodResponse, TimetableSlot } from '@/types/timetable';

/**
 * The college's daily period schedule, as served by the backend (GET /timetable/periods, read through
 * `usePeriodSchedule`). No period times are kept in the frontend: every helper here takes the schedule
 * returned by the backend.
 */
export type ScheduleRow =
  | { kind: 'period'; number: number; label: string; start: string; end: string }
  | { kind: 'break' | 'lunch'; label: string; start: string; end: string };

export type Schedule = readonly ScheduleRow[];
export type Period = Extract<ScheduleRow, { kind: 'period' }>;

const hhmm = (time: string) => time.slice(0, 5);

/** Backend rows → schedule rows, in time order. */
export const scheduleFromPeriods = (rows: PeriodResponse[]): ScheduleRow[] =>
  [...rows]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((r): ScheduleRow =>
      r.type === 'TEACHING' && r.periodNumber !== null
        ? { kind: 'period', number: r.periodNumber, label: r.label, start: hhmm(r.startTime), end: hhmm(r.endTime) }
        : { kind: r.type === 'LUNCH' ? 'lunch' : 'break', label: r.label, start: hhmm(r.startTime), end: hhmm(r.endTime) },
    );

/** Teaching periods only. */
export const periodsOf = (schedule: Schedule): Period[] => schedule.filter((r): r is Period => r.kind === 'period');

/**
 * Where a slot sits in the schedule: the index of its first and last row.
 * A slot fits when it starts exactly at a period's start and ends exactly at a period's end
 * (labs may cover several consecutive periods, including across a break). Anything else is a
 * non-standard slot and returns null — callers must still show it somewhere.
 */
export const placeSlot = (schedule: Schedule, slot: Pick<TimetableSlot, 'startTime' | 'endTime'>): { from: number; to: number } | null => {
  const from = schedule.findIndex((r) => r.kind === 'period' && r.start === hhmm(slot.startTime));
  const to = schedule.findIndex((r) => r.kind === 'period' && r.end === hhmm(slot.endTime));
  return from >= 0 && to >= from ? { from, to } : null;
};

/** Period numbers covered by a placed slot, e.g. "P3" or "P6–P8". */
export const periodRangeLabel = (schedule: Schedule, slot: Pick<TimetableSlot, 'startTime' | 'endTime'>) => {
  const place = placeSlot(schedule, slot);
  if (!place) return null;
  const first = schedule[place.from] as Period;
  const last = schedule[place.to] as Period;
  return first.number === last.number ? `P${first.number}` : `P${first.number}–P${last.number}`;
};
