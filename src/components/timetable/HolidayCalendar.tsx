'use client';

import { useCallback, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Calendar, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Trash2 } from '@/components/ui/icons';
import { FormError, SidePanel } from '@/components/gradebook/shared';
import { ConfirmBox } from '@/components/portfolio/shared';
import { HolidayForm } from '@/components/timetable/HolidayForm';
import { useAuth } from '@/contexts/auth-context';
import { useBatches } from '@/hooks/useAcademic';
import { useDeleteHoliday, useInstitutionHolidays, usePublishCalendar } from '@/hooks/useHolidays';
import { useMyTimetable } from '@/hooks/useTimetable';
import { formatDateTime } from '@/lib/gradebook-labels';
import { todayIso } from '@/lib/erp-labels';
import { WEEK_HEAD, cellLabel, monthCells, monthOf, monthTitle, shiftMonth, yearOf } from '@/lib/calendar';
import {
  CALENDAR_STATUS_LABEL,
  InstitutionCalendar,
  appliesToCohort,
  holidayCategoryLabel,
  holidayDate,
  holidayRange,
  holidayStyle,
  indexByDate,
} from '@/lib/holidays';
import { Holiday } from '@/types/holiday';

const UPCOMING_COUNT = 6;

type Panel = { mode: 'create'; date: string } | { mode: 'edit'; holiday: Holiday } | null;

/** HOD: the selected year's publication state with Publish / Unpublish and Add Holiday. */
function YearBar({ calendar, onAdd }: { calendar: InstitutionCalendar; onAdd: () => void }) {
  const publish = usePublishCalendar();
  const [confirming, setConfirming] = useState(false);
  const { year, status, info } = calendar;
  const published = status === 'PUBLISHED';
  return (
    <Card>
      <div className="p-4 sm:px-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-[600] text-fg">{year} calendar</span>
          <Badge variant={published ? 'success' : status === 'DRAFT' ? 'warning' : 'default'}>{CALENDAR_STATUS_LABEL[status]}</Badge>
        </div>
        <span className="text-[12px] text-muted">
          {info.holidayCount ?? calendar.holidays.length} {(info.holidayCount ?? calendar.holidays.length) === 1 ? 'holiday' : 'holidays'}
          {published && info.publishedAt && ` · published ${formatDateTime(info.publishedAt)}${info.publishedBy ? ` by ${info.publishedBy}` : ' by the system'}`}
          {status === 'DRAFT' && ' · visible to HOD only'}
        </span>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {!confirming && (
            <Button size="sm" variant={published ? 'secondary' : 'primary'} onClick={() => { publish.reset(); setConfirming(true); }}>
              {published ? 'Unpublish' : 'Publish'}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onAdd}><Plus className="w-4 h-4" /> Add Holiday</Button>
        </div>
        {confirming && (
          <div className="w-full">
            <ConfirmBox
              message={published
                ? <>Unpublish the {year} calendar? Staff and students will no longer see its holidays, and attendance and timetables stop treating them as holidays.</>
                : <>Publish the {year} calendar? Its {calendar.holidays.length} {calendar.holidays.length === 1 ? 'holiday becomes' : 'holidays become'} visible to everyone and start counting as college holidays.</>}
              confirmLabel={published ? 'Unpublish' : 'Publish'}
              variant={published ? 'danger' : 'primary'}
              isLoading={publish.isPending}
              onCancel={() => setConfirming(false)}
              onConfirm={() => publish.mutate({ year, publish: !published }, { onSuccess: () => setConfirming(false) })}
            />
          </div>
        )}
        {publish.isError && <div className="w-full"><FormError error={publish.error} fallback="Unable to change the publication status." /></div>}
      </div>
    </Card>
  );
}

function HolidayDetails({ holidays, isHod, cohortName, onEdit }: {
  holidays: Holiday[]; isHod: boolean; cohortName: (id: number) => string; onEdit: (h: Holiday) => void;
}) {
  const remove = useDeleteHoliday();
  const [deleting, setDeleting] = useState<number | null>(null);
  return (
    <ul className="space-y-5">
      {holidays.map((h) => (
        <li key={h.id} className="space-y-2">
          <div className="flex items-start gap-2">
            <p className="text-[15px] font-[600] text-fg leading-snug flex-1">{h.name}</p>
            {isHod && h.calendarStatus === 'DRAFT' && <Badge variant="warning">Draft</Badge>}
          </div>
          <dl className="grid grid-cols-[84px_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
            <dt className="text-muted">Date</dt>
            <dd className="text-fg">{holidayRange(h)}</dd>
            <dt className="text-muted">Type</dt>
            <dd><Badge variant={holidayStyle(h.category).badge}>{holidayCategoryLabel(h.category)}</Badge></dd>
            {h.description && (<><dt className="text-muted">Description</dt><dd className="text-fg whitespace-pre-line">{h.description}</dd></>)}
            <dt className="text-muted">Applies to</dt>
            <dd className="text-fg">{h.batchIds.length === 0 ? 'Whole institution' : h.batchIds.map(cohortName).join(', ')}</dd>
          </dl>
          {isHod && h.scope === 'COLLEGE' && (
            deleting === h.id ? (
              <ConfirmBox message={<>Delete <strong>{h.name}</strong>?{h.calendarStatus === 'PUBLISHED' && ' It is removed from the published calendar at once.'}</>}
                confirmLabel="Delete" variant="danger" isLoading={remove.isPending}
                onCancel={() => setDeleting(null)}
                onConfirm={() => remove.mutate(h.id, { onSuccess: () => setDeleting(null) })} />
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => onEdit(h)}><Pencil className="w-4 h-4" /> Edit</Button>
                <Button size="sm" variant="secondary" onClick={() => { remove.reset(); setDeleting(h.id); }}><Trash2 className="w-4 h-4" /> Delete</Button>
              </div>
            )
          )}
        </li>
      ))}
      {remove.isError && <FormError error={remove.error} fallback="Unable to delete the holiday." />}
    </ul>
  );
}

/**
 * Institution holiday calendar (Timetable → Holidays), the same component for HOD, STAFF and STUDENT.
 * Every holiday comes from the backend's college calendar (contract E); nothing is hardcoded.
 * STAFF / STUDENT see published years only (the backend never sends them drafts). The HOD also sees drafts and
 * manages holidays and publication here. Students see the holidays that apply to their own cohort.
 */
export function HolidayCalendar() {
  const { hasRole } = useAuth();
  const isHod = hasRole('ROLE_HOD');
  const isStudent = !isHod && !hasRole('ROLE_STAFF');
  const today = todayIso();
  const [month, setMonth] = useState(monthOf(today));
  const [selected, setSelected] = useState(today);
  const [panel, setPanel] = useState<Panel>(null);
  const viewYear = yearOf(month);
  const thisYear = yearOf(today);

  const view = useInstitutionHolidays(viewYear);
  // Upcoming list: the rest of this year and next year (react-query shares the request with `view`).
  const current = useInstitutionHolidays(thisYear);
  const next = useInstitutionHolidays(thisYear + 1);
  // Cohort names for "Applies to" (students can't call /batches); a student's own cohorts from their timetable.
  const batches = useBatches(!isStudent);
  const myTimetable = useMyTimetable(isStudent);
  const myCohorts = useMemo(() => new Set((myTimetable.data ?? []).map((s) => s.batchId)), [myTimetable.data]);

  const visible = useCallback(
    (list: Holiday[]) => (isStudent && myCohorts.size > 0 ? list.filter((h) => [...myCohorts].some((b) => appliesToCohort(h, b))) : list),
    [isStudent, myCohorts],
  );
  const cohortName = (id: number) => batches.data?.find((b) => b.id === id)?.name ?? (isStudent && myCohorts.has(id) ? 'Your cohort' : `Cohort #${id}`);

  const calendar = view.data;
  // HOD sees every college entry of the year (drafts too); everyone else only gets published years.
  const yearHolidays = useMemo(() => visible(isHod ? calendar?.holidays ?? [] : calendar?.effective ?? []), [visible, isHod, calendar]);
  const byDate = useMemo(() => indexByDate(yearHolidays), [yearHolidays]);
  const cells = monthCells(month);
  const inMonth = [...byDate.keys()].filter((d) => monthOf(d) === month);
  const categories = [...new Set(yearHolidays.map((h) => h.category))];

  const upcoming = useMemo(
    () => visible([...(current.data?.effective ?? []), ...(next.data?.effective ?? [])])
      .filter((h) => (h.endDate ?? h.startDate) >= today)
      .slice(0, UPCOMING_COUNT),
    [visible, current.data, next.data, today],
  );

  const goTo = (date: string) => { setMonth(monthOf(date)); setSelected(date); };
  const selectedHolidays = byDate.get(selected) ?? [];
  const selectedInView = monthOf(selected) === month;
  const published = calendar?.status === 'PUBLISHED';

  let note = null;
  if (view.isLoading) {
    note = <p className="inline-flex items-center gap-2 text-[12px] text-muted"><Spinner size="sm" /> Loading holidays…</p>;
  } else if (view.isError) {
    note = (
      <div className="flex flex-wrap items-center gap-3 rounded-[12px] bg-danger-soft text-danger px-4 py-3 text-[13px]" role="alert">
        <span>Unable to load holidays.</span>
        <button type="button" className="f-btn" onClick={() => view.refetch()}><RefreshCw className="w-4 h-4" /> Retry</button>
      </div>
    );
  } else if (!published && !isHod) {
    note = <p className="text-[12.5px] text-muted" role="status">College holiday calendar for {viewYear} has not been published yet.</p>;
  } else if (calendar?.status === 'DRAFT') {
    note = <p className="text-[12.5px] text-muted" role="status">The {viewYear} calendar is a draft. Staff and students can&apos;t see it until it is published.</p>;
  } else if (calendar?.status === 'NOT_CREATED') {
    note = <p className="text-[12.5px] text-muted" role="status">There is no {viewYear} calendar yet. Adding a holiday starts a draft.</p>;
  } else if (inMonth.length === 0) {
    note = <p className="text-[12.5px] text-muted" role="status">No holidays scheduled for this month.</p>;
  } else {
    note = <p className="text-[12px] text-muted" role="status">{inMonth.length} holiday {inMonth.length === 1 ? 'day' : 'days'} in {monthTitle(month)}.</p>;
  }

  let details;
  if (!selectedInView) details = <p className="text-[13px] text-muted">Select a date to see its holiday.</p>;
  else if (view.isLoading) details = <Spinner size="sm" />;
  else if (view.isError) details = <p className="text-[13px] text-muted">Holiday details are unavailable while the calendar can&apos;t be loaded.</p>;
  else if (!published && !isHod) details = <p className="text-[13px] text-muted">The {viewYear} calendar has not been published yet.</p>;
  else if (selectedHolidays.length === 0) {
    details = (
      <div className="space-y-3">
        <p className="text-[13px] text-muted">No holiday on {holidayDate(selected)}.</p>
        {isHod && <Button size="sm" variant="secondary" onClick={() => setPanel({ mode: 'create', date: selected })}><Plus className="w-4 h-4" /> Add holiday on this date</Button>}
      </div>
    );
  } else details = <HolidayDetails holidays={selectedHolidays} isHod={isHod} cohortName={cohortName} onEdit={(h) => setPanel({ mode: 'edit', holiday: h })} />;

  return (
    <div className="space-y-4">
      {isHod && calendar && !view.isError && <YearBar calendar={calendar} onAdd={() => setPanel({ mode: 'create', date: monthOf(selected) === month ? selected : `${month}-01` })} />}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <Card>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <button type="button" className="f-btn icon" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
                <ChevronLeft />
              </button>
              <button type="button" className="f-btn icon" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
                <ChevronRight />
              </button>
              <h3 className="text-[15px] font-[600] text-fg ml-1" aria-live="polite">{monthTitle(month)}</h3>
              <button type="button" className="f-btn ml-auto" onClick={() => goTo(today)} disabled={month === monthOf(today) && selected === today}>
                Today
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Holiday calendar, ${monthTitle(month)}`}>
              {WEEK_HEAD.map((d) => (
                <div key={d} role="columnheader" className="text-center text-[11px] text-muted py-1">{d}</div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={`blank-${i}`} aria-hidden />;
                const dayHolidays = byDate.get(date) ?? [];
                const holiday = dayHolidays[0];
                const style = holiday ? holidayStyle(holiday.category) : null;
                const isToday = date === today;
                const isSelected = date === selected;
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-label={`${cellLabel(date)}${isToday ? ', today' : ''}${dayHolidays.length ? `, holiday: ${dayHolidays.map((h) => h.name).join(', ')}` : ''}`}
                    onClick={() => setSelected(date)}
                    className={[
                      'relative min-h-[46px] sm:min-h-[64px] rounded-[10px] p-1 sm:p-1.5 text-left transition-colors flex flex-col gap-0.5 overflow-hidden',
                      style ? style.cell : 'hover:bg-soft',
                      isSelected ? 'ring-2 ring-accent' : isToday ? 'ring-1 ring-line-strong' : '',
                    ].join(' ')}
                  >
                    <span className={`text-[12.5px] tabular-nums leading-none ${isToday ? 'font-[700] text-accent' : holiday ? 'font-[600] text-fg' : 'text-fg'}`}>
                      {Number(date.slice(8))}
                    </span>
                    {holiday && (
                      <>
                        {/* Names fit when the grid is wide (tablet, large desktop); narrow grids show a dot instead. */}
                        <span className="hidden sm:block lg:hidden xl:block text-[10.5px] leading-tight text-fg line-clamp-2">{holiday.name}</span>
                        <span className={`sm:hidden lg:block xl:hidden absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${style?.dot}`} aria-hidden />
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
              {categories.map((category) => (
                <span key={category} className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${holidayStyle(category).dot}`} aria-hidden /> {holidayCategoryLabel(category)}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[4px] ring-1 ring-line-strong" aria-hidden /> Today</span>
            </div>
            <div className="mt-3">{note}</div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="p-4 sm:p-5">
              <h3 className="text-[13px] font-[600] text-fg mb-3">{selectedInView ? holidayDate(selected) : 'Holiday details'}</h3>
              {details}
            </div>
          </Card>

          <Card>
            <div className="p-4 sm:p-5">
              <h3 className="text-[13px] font-[600] text-fg mb-3">Upcoming holidays</h3>
              {current.isLoading || next.isLoading ? (
                <Spinner size="sm" />
              ) : current.isError ? (
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-danger" role="alert">
                  <span>Unable to load holidays.</span>
                  <button type="button" className="f-btn" onClick={() => { current.refetch(); next.refetch(); }}>Retry</button>
                </div>
              ) : upcoming.length === 0 ? (
                <div className="flex items-start gap-2 text-[13px] text-muted">
                  <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>No upcoming holidays in the published college calendar.</span>
                </div>
              ) : (
                <ul className="divide-y divide-line -my-2">
                  {upcoming.map((h) => (
                    <li key={h.id}>
                      <button type="button" onClick={() => goTo(h.startDate)}
                        className="w-full text-left py-2.5 flex items-center gap-3 hover:bg-soft rounded-[8px] px-1.5 -mx-1.5 transition-colors"
                        aria-label={`${h.name}, ${holidayRange(h)}. Show in calendar`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${holidayStyle(h.category).dot}`} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-[550] text-fg truncate">{h.name}</span>
                          <span className="block text-[11.5px] text-muted">{holidayRange(h)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!current.isError && next.isError && (
                <p className="text-[11.5px] text-muted mt-3">Next year&apos;s holidays could not be loaded.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {isHod && panel && (
        <SidePanel title={panel.mode === 'create' ? 'Add Holiday' : 'Edit Holiday'} onClose={() => setPanel(null)}>
          <HolidayForm
            key={panel.mode === 'edit' ? panel.holiday.id : 'new'}
            holiday={panel.mode === 'edit' ? panel.holiday : undefined}
            defaultDate={panel.mode === 'create' ? panel.date : undefined}
            onSaved={(saved) => { setPanel(null); goTo(saved.startDate); }}
          />
        </SidePanel>
      )}
    </div>
  );
}
