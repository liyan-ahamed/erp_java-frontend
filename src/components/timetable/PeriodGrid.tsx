'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Period, Schedule, ScheduleRow, periodRangeLabel, placeSlot } from '@/lib/academic-periods';
import { DAYS, DAY_LABELS, SLOT_TYPE_LABELS, dayOfDate, formatTime, todayIso } from '@/lib/erp-labels';
import { DayOfWeek, TimetableSlot } from '@/types/timetable';

export interface PeriodGridProps {
  /** The institution's daily schedule from the backend (usePeriodSchedule). */
  schedule: Schedule;
  /** Active slots to show. Non-standard ones are left out here; render them with NonStandardSlots. */
  slots: TimetableSlot[];
  /** Show the class on each cell (faculty view, staff's own timetable). */
  showClass?: boolean;
  /** Hide the faculty name (staff's own timetable). */
  hideFaculty?: boolean;
  /** HOD: click a free teaching cell to add a class there. */
  onFreeCell?: (day: DayOfWeek, period: Period) => void;
  /** HOD: click a class to edit it. */
  onSlotClick?: (slot: TimetableSlot) => void;
}

type Placed = { from: number; to: number; slots: TimetableSlot[] };

const WEEKDAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const SHORT: Record<DayOfWeek, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

/** Monday–Friday always; Saturday/Sunday only when the timetable actually has classes on them. */
export const gridDays = (slots: TimetableSlot[]) =>
  DAYS.filter((d) => WEEKDAYS.includes(d) || slots.some((s) => s.dayOfWeek === d));

/**
 * Groups each day's slots by their place in the schedule. Slots that don't match the standard periods,
 * or that only partly overlap another class, can't be drawn in the grid and are returned as `unplaced`.
 */
export const layoutSlots = (schedule: Schedule, slots: TimetableSlot[]) => {
  const byDay = new Map<DayOfWeek, Placed[]>();
  const unplaced: TimetableSlot[] = [];
  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
  for (const slot of sorted) {
    const place = placeSlot(schedule, slot);
    if (!place) { unplaced.push(slot); continue; }
    const day = byDay.get(slot.dayOfWeek) ?? [];
    const same = day.find((p) => p.from === place.from && p.to === place.to);
    if (same) same.slots.push(slot);
    else if (day.some((p) => place.from <= p.to && place.to >= p.from)) unplaced.push(slot);
    else day.push({ ...place, slots: [slot] });
    byDay.set(slot.dayOfWeek, day);
  }
  return { byDay, unplaced };
};

function SlotCard({ slot, showClass, hideFaculty, onClick, span }: {
  slot: TimetableSlot; showClass?: boolean; hideFaculty?: boolean; onClick?: () => void; span: string | null;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-1.5">
        <span className="text-[12px] font-[550] text-fg leading-snug">{slot.subjectName}</span>
        {slot.slotType !== 'LECTURE' && <Badge variant="outline" className="!text-[10px] !px-1.5 shrink-0">{SLOT_TYPE_LABELS[slot.slotType]}</Badge>}
      </div>
      <div className="font-mono text-[10.5px] text-muted mt-0.5 break-all">{slot.subjectCode}</div>
      {!hideFaculty && <div className="text-[11px] text-muted mt-1 truncate" title={slot.staffName}>{slot.staffName}</div>}
      {showClass && <div className="text-[11px] text-muted truncate">{slot.batchName} · Sec {slot.sectionName}</div>}
      {slot.room && <div className="text-[11px] text-muted">Room {slot.room}</div>}
      {span && <div className="text-[10.5px] text-muted mt-1">{span} · {formatTime(slot.startTime)}–{formatTime(slot.endTime)}</div>}
    </>
  );
  const cls = 'block w-full text-left rounded-[10px] border border-line bg-soft px-2.5 py-2';
  return onClick ? (
    <button type="button" className={`${cls} hover:border-line-strong transition-colors`} onClick={onClick}
      aria-label={`${slot.subjectName}, ${DAY_LABELS[slot.dayOfWeek]} ${formatTime(slot.startTime)}–${formatTime(slot.endTime)}. Edit`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const breakLabel = (row: ScheduleRow) => `${row.label} · ${row.start}–${row.end}`;

/** Weekly timetable on the college's fixed periods. Desktop: day × period grid. Phones: one day at a time. */
export function PeriodGrid({ schedule, slots, showClass, hideFaculty, onFreeCell, onSlotClick }: PeriodGridProps) {
  const days = gridDays(slots);
  const { byDay } = layoutSlots(schedule, slots);
  const today = dayOfDate(todayIso());
  const [pickedDay, setMobileDay] = useState<DayOfWeek>(today && days.includes(today) ? today : days[0]);
  // A new view may not include the picked day (e.g. Saturday); fall back to the first day.
  const mobileDay = days.includes(pickedDay) ? pickedDay : days[0];

  const covered = (day: DayOfWeek, rowIndex: number) => (byDay.get(day) ?? []).find((p) => rowIndex >= p.from && rowIndex <= p.to);

  return (
    <>
      {/* Desktop / tablet: CSS grid, so multi-period labs span rows and breaks span all days. */}
      <Card className="hidden md:block p-3">
        <div className="overflow-x-auto">
          <div
            className="grid gap-px bg-line border border-line rounded-[12px] overflow-hidden min-w-fit"
            style={{ gridTemplateColumns: `86px repeat(${days.length}, minmax(112px, 1fr))` }}
            role="table"
            aria-label="Weekly timetable"
          >
            <div className="bg-soft px-3 py-2.5 text-[11px] text-muted" role="columnheader">Period</div>
            {days.map((d) => (
              <div key={d} role="columnheader"
                className={`bg-soft px-3 py-2.5 text-[12px] ${d === today ? 'text-accent font-[550]' : 'text-muted'}`}>
                {DAY_LABELS[d]}{d === today && <span className="sr-only"> (today)</span>}
              </div>
            ))}

            {schedule.map((row, i) => {
              const gridRow = i + 2;
              if (row.kind !== 'period') {
                return (
                  <div key={row.label} role="row" className="contents">
                    <div style={{ gridRow, gridColumn: '1 / -1' }}
                      className="bg-soft text-muted text-[11px] px-3 py-1.5 flex items-center gap-2 tracking-wide">
                      <span className="uppercase">{row.label}</span>
                      <span>{row.start}–{row.end}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div key={row.label} role="row" className="contents">
                  <div style={{ gridRow, gridColumn: 1 }} className="bg-surface px-3 py-2.5" role="rowheader">
                    <div className="text-[12px] font-[550] text-fg">P{row.number}</div>
                    <div className="text-[11px] text-muted whitespace-nowrap">{row.start}–{row.end}</div>
                  </div>
                  {days.map((d, di) => {
                    const placed = covered(d, i);
                    if (placed && placed.from !== i) return null; // spanned by a class that starts above
                    const style = { gridRow: placed ? `${placed.from + 2} / ${placed.to + 3}` : gridRow, gridColumn: di + 2 };
                    if (placed) {
                      return (
                        <div key={d} style={style} className="bg-surface p-1.5 space-y-1.5" role="cell">
                          {placed.slots.map((s) => (
                            <SlotCard key={s.id} slot={s} showClass={showClass} hideFaculty={hideFaculty}
                              span={placed.to > placed.from ? periodRangeLabel(schedule, s) : null}
                              onClick={onSlotClick ? () => onSlotClick(s) : undefined} />
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div key={d} style={style} className="bg-surface p-1.5 min-h-[64px]" role="cell">
                        {onFreeCell && (
                          <button type="button" onClick={() => onFreeCell(d, row)}
                            className="w-full h-full min-h-[52px] rounded-[10px] text-[11px] text-transparent hover:text-muted hover:bg-soft focus-visible:text-muted transition-colors"
                            aria-label={`Add a class on ${DAY_LABELS[d]}, period ${row.number}`}>
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Phone: day tabs, then that day's periods in order. */}
      <div className="md:hidden space-y-3">
        <Tabs label="Day" value={mobileDay} onChange={setMobileDay} className="!mb-0"
          items={days.map((d) => ({ value: d, label: d === today ? `${SHORT[d]} •` : SHORT[d] }))} />
        <Card>
          <ul className="divide-y divide-line">
            {schedule.map((row, i) => {
              if (row.kind !== 'period') {
                return <li key={row.label} className="px-4 py-2 bg-soft text-[11px] text-muted uppercase tracking-wide">{breakLabel(row)}</li>;
              }
              const placed = covered(mobileDay, i);
              if (placed && placed.from !== i) return null;
              const last = placed ? (schedule[placed.to] as Period) : row;
              return (
                <li key={row.label} className="px-4 py-3 flex gap-3">
                  <div className="w-[72px] shrink-0">
                    <div className="text-[12px] font-[550] text-fg">{placed && placed.to > placed.from ? `P${row.number}–P${last.number}` : `P${row.number}`}</div>
                    <div className="text-[11px] text-muted">{row.start}–{last.end}</div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {placed ? (
                      placed.slots.map((s) => (
                        <SlotCard key={s.id} slot={s} showClass={showClass} hideFaculty={hideFaculty} span={null}
                          onClick={onSlotClick ? () => onSlotClick(s) : undefined} />
                      ))
                    ) : onFreeCell ? (
                      <button type="button" className="text-[12px] text-muted hover:text-fg" onClick={() => onFreeCell(mobileDay, row)}>
                        Free — add a class
                      </button>
                    ) : (
                      <span className="text-[12px] text-muted">Free</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}

/**
 * Slots that can't be drawn on the period grid (times outside the standard periods, or partly overlapping
 * another class). They are never hidden — this list shows each one.
 */
export function NonStandardSlots({ slots, showClass, onSlotClick }: { slots: TimetableSlot[]; showClass?: boolean; onSlotClick?: (s: TimetableSlot) => void }) {
  if (slots.length === 0) return null;
  return (
    <Card>
      <div className="px-5 py-3 border-b border-line flex flex-wrap items-center gap-2">
        <h3 className="text-[13px] font-[550] text-fg">Other times</h3>
        <span className="text-[12px] text-muted">
          {slots.length} class{slots.length === 1 ? '' : 'es'} outside the standard periods
        </span>
      </div>
      <ul className="divide-y divide-line">
        {slots.map((s) => (
          <li key={s.id} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[12px] font-[550] text-fg w-40">{DAY_LABELS[s.dayOfWeek]} {formatTime(s.startTime)}–{formatTime(s.endTime)}</span>
            <span className="text-[12px] text-fg min-w-0 flex-1">
              {s.subjectName} <span className="font-mono text-[11px] text-muted">{s.subjectCode}</span>
              <span className="text-muted"> · {s.staffName}{showClass ? ` · ${s.batchName} Sec ${s.sectionName}` : ''}{s.room ? ` · Room ${s.room}` : ''}</span>
            </span>
            <Badge variant="warning">Non-standard</Badge>
            {onSlotClick && (
              <button type="button" className="text-[12px] text-accent hover:underline" onClick={() => onSlotClick(s)}>Edit</button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
