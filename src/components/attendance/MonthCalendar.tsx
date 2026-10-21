'use client';

import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { dayOfDate, todayIso } from '@/lib/erp-labels';
import { WEEK_HEAD, cellLabel, monthCells, monthTitle, shiftMonth } from '@/lib/calendar';
import { InstitutionCalendar } from '@/lib/holidays';
import { DayOfWeek } from '@/types/timetable';

interface MonthCalendarProps {
  month: string;
  onMonthChange: (month: string) => void;
  selected: string;
  onSelect: (isoDate: string) => void;
  /** Weekdays that have classes in the weekly timetable being viewed. */
  classDays: Set<DayOfWeek>;
  /** The institution holiday calendar for the month's year (shared with Timetable → Holidays). Only published holidays are marked. */
  holidays?: InstitutionCalendar;
  holidaysLoading?: boolean;
  holidaysError?: boolean;
}

/**
 * Month calendar used to open a day's attendance. Marks today, the selected day, the days that have
 * scheduled classes (from the weekly timetable) and the college calendar's holidays. Holidays are display
 * only: they don't change which classes are listed or whether attendance can be taken.
 */
export function MonthCalendar({ month, onMonthChange, selected, onSelect, classDays, holidays, holidaysLoading, holidaysError }: MonthCalendarProps) {
  const today = todayIso();
  const cells = monthCells(month);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button type="button" className="f-btn icon" aria-label="Previous month" onClick={() => onMonthChange(shiftMonth(month, -1))}>
          <ChevronLeft />
        </button>
        <h3 className="text-[14px] font-[550] text-fg" aria-live="polite">{monthTitle(month)}</h3>
        <button type="button" className="f-btn icon" aria-label="Next month" onClick={() => onMonthChange(shiftMonth(month, 1))}>
          <ChevronRight />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Calendar, ${monthTitle(month)}`}>
        {WEEK_HEAD.map((d) => (
          <div key={d} role="columnheader" className="text-center text-[11px] text-muted py-1">{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} aria-hidden />;
          const day = dayOfDate(date);
          const hasClasses = !!day && classDays.has(day);
          const isSelected = date === selected;
          const isToday = date === today;
          const label = cellLabel(date);
          const dayHolidays = holidays?.effectiveByDate.get(date) ?? [];
          const isHoliday = dayHolidays.length > 0;
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${label}${isToday ? ', today' : ''}${isHoliday ? `, holiday: ${dayHolidays.map((h) => h.name).join(', ')}` : ''}${hasClasses ? ', classes scheduled' : ', no classes'}`}
              onClick={() => onSelect(date)}
              className={[
                'relative h-10 rounded-[10px] text-[13px] tabular-nums transition-colors flex flex-col items-center justify-center',
                isSelected ? 'bg-accent-soft text-fg font-[600] ring-1 ring-accent' : isHoliday ? 'bg-warn-soft hover:bg-warn-soft' : 'hover:bg-soft',
                !isSelected && isToday ? 'ring-1 ring-line-strong font-[600]' : '',
                hasClasses ? 'text-fg' : 'text-muted',
              ].join(' ')}
            >
              {Number(date.slice(8))}
              {hasClasses && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden /> Classes scheduled</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[4px] ring-1 ring-line-strong" aria-hidden /> Today</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[4px] bg-accent-soft ring-1 ring-accent" aria-hidden /> Selected</span>
        {holidaysError ? (
          <span>Holidays could not be loaded</span>
        ) : holidaysLoading ? (
          <span>Loading holidays…</span>
        ) : holidays?.status === 'PUBLISHED' ? (
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[4px] bg-warn-soft" aria-hidden /> College holiday</span>
        ) : holidays ? (
          <span>Holidays: college calendar for {month.slice(0, 4)} not published</span>
        ) : null}
      </div>
    </div>
  );
}
