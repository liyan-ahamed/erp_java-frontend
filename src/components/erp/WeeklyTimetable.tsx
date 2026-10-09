import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DAYS, DAY_LABELS, SLOT_TYPE_LABELS, formatTime } from '@/lib/erp-labels';
import { DayOfWeek, TimetableSlot } from '@/types/timetable';

interface WeeklyTimetableProps {
  slots: TimetableSlot[];
  /** Show the class (section) on each slot — useful for staff, who teach several sections. */
  showClass?: boolean;
  /** Hide the faculty name (e.g. on a staff member's own timetable). */
  hideFaculty?: boolean;
}

function SlotCard({ slot, showClass, hideFaculty }: { slot: TimetableSlot } & Omit<WeeklyTimetableProps, 'slots'>) {
  return (
    <div className="rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] p-2.5 text-left">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-[#666666]">{slot.subjectCode}</span>
        <Badge variant="outline" className="text-[10px] px-1.5">{SLOT_TYPE_LABELS[slot.slotType]}</Badge>
      </div>
      <p className="text-xs font-semibold text-[#111111] mt-1 leading-snug">{slot.subjectName}</p>
      {!hideFaculty && <p className="text-[11px] text-[#666666] mt-0.5">{slot.staffName}</p>}
      <p className="text-[11px] text-[#9A9A9A] mt-0.5">
        {slot.room ? `Room ${slot.room}` : 'No room set'}
        {showClass && ` · ${slot.batchName} Sec ${slot.sectionName}`}
      </p>
    </div>
  );
}

/**
 * Recurring weekly timetable. Desktop: a time × day grid. Phones: one card per day,
 * because a 6-column grid is unreadable at ~390px.
 */
export function WeeklyTimetable({ slots, showClass, hideFaculty }: WeeklyTimetableProps) {
  // Monday–Saturday always; Sunday only when something is scheduled on it.
  const days = DAYS.filter((d) => d !== 'SUNDAY' || slots.some((s) => s.dayOfWeek === 'SUNDAY'));
  const times = [...new Map(slots.map((s) => [`${s.startTime}-${s.endTime}`, s])).values()]
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
  const at = (day: DayOfWeek, start: string, end: string) =>
    slots.filter((s) => s.dayOfWeek === day && s.startTime === start && s.endTime === end);

  return (
    <>
      {/* Desktop grid */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#F5F5F5]">
                <th scope="col" className="h-11 px-3 text-left text-xs font-medium text-[#9A9A9A] w-28">Time</th>
                {days.map((d) => (
                  <th key={d} scope="col" className="h-11 px-3 text-left text-xs font-medium text-[#9A9A9A] min-w-36">{DAY_LABELS[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {times.map((t) => {
                const periods = [...new Set(slots.filter((s) => s.startTime === t.startTime && s.endTime === t.endTime && s.periodNumber).map((s) => s.periodNumber))];
                return (
                  <tr key={`${t.startTime}-${t.endTime}`}>
                    <th scope="row" className="px-3 py-3 align-top text-left font-normal">
                      <div className="text-xs font-semibold text-[#111111] whitespace-nowrap">{formatTime(t.startTime)}–{formatTime(t.endTime)}</div>
                      {periods.length > 0 && <div className="text-[11px] text-[#9A9A9A]">Period {periods.join(', ')}</div>}
                    </th>
                    {days.map((d) => (
                      <td key={d} className="px-2 py-2 align-top">
                        <div className="space-y-1.5">
                          {at(d, t.startTime, t.endTime).map((s) => <SlotCard key={s.id} slot={s} showClass={showClass} hideFaculty={hideFaculty} />)}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Phone: day-by-day list */}
      <div className="md:hidden space-y-4">
        {days.map((d) => {
          const daySlots = slots.filter((s) => s.dayOfWeek === d);
          return (
            <Card key={d}>
              <div className="px-4 py-3 border-b border-[#F5F5F5] text-sm font-semibold text-[#111111]">{DAY_LABELS[d]}</div>
              {daySlots.length === 0 ? (
                <p className="px-4 py-3 text-xs text-[#9A9A9A]">No classes</p>
              ) : (
                <ul className="divide-y divide-[#F5F5F5]">
                  {daySlots.map((s) => (
                    <li key={s.id} className="px-4 py-3 flex gap-3">
                      <div className="w-20 flex-shrink-0">
                        <div className="text-xs font-semibold text-[#111111]">{formatTime(s.startTime)}–{formatTime(s.endTime)}</div>
                        {s.periodNumber && <div className="text-[11px] text-[#9A9A9A]">Period {s.periodNumber}</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111111]">
                          {s.subjectName} <span className="font-mono text-[11px] text-[#9A9A9A]">{s.subjectCode}</span>
                        </p>
                        <p className="text-xs text-[#666666]">
                          {SLOT_TYPE_LABELS[s.slotType]}
                          {!hideFaculty && ` · ${s.staffName}`}
                          {s.room && ` · Room ${s.room}`}
                          {showClass && ` · ${s.batchName} Sec ${s.sectionName}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
