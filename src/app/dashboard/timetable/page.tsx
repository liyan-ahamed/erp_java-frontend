'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Pencil, Plus } from '@/components/ui/icons';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { FilterBar, ReadOnlyNote } from '@/components/erp/shared';
import { AcademicContextFilter } from '@/components/academic/AcademicContextFilter';
import { ContextPrompt, missingContext } from '@/components/academic/ContextGate';
import { NonStandardSlots, PeriodGrid, layoutSlots } from '@/components/timetable/PeriodGrid';
import { SlotForm } from '@/components/timetable/SlotForm';
import { HolidayCalendar } from '@/components/timetable/HolidayCalendar';
import { useAuth } from '@/contexts/auth-context';
import { useBatches } from '@/hooks/useAcademic';
import { useAllSubjectOfferings, useStaffOptions } from '@/hooks/useGradebook';
import { useMyTimetable, usePeriodSchedule, useTimetableSlots } from '@/hooks/useTimetable';
import { Period, Schedule, periodRangeLabel } from '@/lib/academic-periods';
import { AcademicContext, EMPTY_CONTEXT, matchesContext } from '@/lib/academic-context';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import { DAYS, DAY_LABELS, SLOT_TYPE_LABELS, formatTime } from '@/lib/erp-labels';
import { DayOfWeek, TimetableSlot } from '@/types/timetable';

type TimetableTab = 'week' | 'list' | 'holidays';

// ---------- STUDENT / STAFF ----------

/** The signed-in user's own timetable from /timetable/me. Students only ever see their own classes. */
function MyTimetable({ isStaff }: { isStaff: boolean }) {
  const { data, isLoading, isError, error } = useMyTimetable();
  const periods = usePeriodSchedule();
  if (isLoading || periods.isLoading) return <LoadingBlock label="Loading timetable..." />;
  if (periods.isError || !periods.data) return <ErrorBanner error={periods.error} fallback="Unable to load the period schedule." title="Error Loading Timetable" />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load the timetable." title="Error Loading Timetable" />;
  const schedule = periods.data;
  const slots = data.filter((s) => s.active);
  if (slots.length === 0) {
    return <Card><EmptyBlock icon={<CalendarDays className="w-10 h-10" />} title="No timetable available." hint={isStaff ? 'Classes appear here once the HOD schedules your courses.' : 'Classes appear here once your enrolled courses are scheduled.'} /></Card>;
  }
  const { unplaced } = layoutSlots(schedule, slots);
  return (
    <div className="space-y-4">
      {isStaff && <ReadOnlyNote>Your teaching timetable. Timetable changes are made by the HOD.</ReadOnlyNote>}
      <PeriodGrid schedule={schedule} slots={slots} showClass={isStaff} hideFaculty={isStaff} />
      <NonStandardSlots slots={unplaced} showClass={isStaff} />
    </div>
  );
}

// ---------- HOD ----------

type Panel =
  | { mode: 'create'; day?: DayOfWeek; period?: Period }
  | { mode: 'edit'; slot: TimetableSlot }
  | null;

/** Weekly period grid for one class (Cohort → Semester → Section) or one faculty member. */
function HodWeek() {
  const offerings = useAllSubjectOfferings();
  const batches = useBatches();
  const staff = useStaffOptions();
  const periods = usePeriodSchedule();
  const schedule: Schedule = periods.data ?? [];
  const [viewBy, setViewBy] = useState<'class' | 'faculty'>('class');
  const [ctx, setCtx] = useState<AcademicContext>(EMPTY_CONTEXT);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const all = useMemo(() => offerings.data ?? [], [offerings.data]);
  const classChosen = viewBy === 'class' && ctx.sectionId !== null && ctx.semester !== null;
  const facultyChosen = viewBy === 'faculty' && staffId !== null;

  // Only the chosen class (cohort + semester + section) or faculty member is ever requested.
  const slotsQuery = useTimetableSlots(
    viewBy === 'class'
      ? { batchId: ctx.batchId ?? undefined, semester: ctx.semester ?? undefined, sectionId: ctx.sectionId ?? undefined }
      : { staffId: staffId ?? undefined },
    classChosen || facultyChosen,
  );
  const slots = (slotsQuery.data ?? []).filter((s) => s.active && (viewBy === 'faculty' || s.semester === ctx.semester));
  const { unplaced } = layoutSlots(schedule, slots);

  // Courses the new/edited slot may belong to: this class's courses, or this faculty member's.
  const candidates = viewBy === 'class'
    ? all.filter((o) => matchesContext(o, { ...ctx, subjectId: null }))
    : all.filter((o) => o.staffId === staffId);

  const toolbar = (
    <FilterBar>
      <select aria-label="View by" className={SELECT_CLASS} value={viewBy} onChange={(e) => setViewBy(e.target.value as 'class' | 'faculty')}>
        <option value="class">View by class</option>
        <option value="faculty">View by faculty</option>
      </select>
      {viewBy === 'class' ? (
        <AcademicContextFilter rows={all} value={ctx} onChange={setCtx} cohorts={batches.data} levels={['cohort', 'semester', 'section']}
          mode="picker" idPrefix="tt" disabled={offerings.isLoading} />
      ) : (
        <select aria-label="Faculty" className={SELECT_CLASS} value={staffId ?? ''} disabled={staff.isLoading}
          onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">{staff.isLoading ? 'Loading faculty…' : 'Select faculty'}</option>
          {(staff.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
      {slotsQuery.isFetching && <Spinner size="sm" />}
      {(classChosen || facultyChosen) && periods.data && (
        <Button size="sm" className="sm:ml-auto" onClick={() => setPanel({ mode: 'create' })}><Plus /> Add Class</Button>
      )}
    </FilterBar>
  );

  let body;
  if (offerings.isError || batches.isError) {
    body = <ErrorBanner error={offerings.error ?? batches.error} fallback="Unable to load classes." />;
  } else if (!classChosen && !facultyChosen) {
    body = (
      <ContextPrompt icon={<CalendarDays className="w-10 h-10" />}
        title={viewBy === 'class' ? 'Select a cohort, semester and section to view the timetable.' : 'Select a faculty member to view their teaching timetable.'} />
    );
  } else if (periods.isError) {
    body = <ErrorBanner error={periods.error} fallback="Unable to load the period schedule." title="Error Loading Timetable" />;
  } else if (slotsQuery.isLoading || periods.isLoading) {
    body = <LoadingBlock label="Loading timetable..." />;
  } else if (slotsQuery.isError) {
    body = <ErrorBanner error={slotsQuery.error} fallback="Unable to load the timetable." title="Error Loading Timetable" />;
  } else {
    body = (
      <div className="space-y-4">
        {slots.length === 0 && (
          <ReadOnlyNote>No classes scheduled yet. Click a free period to add one.</ReadOnlyNote>
        )}
        <PeriodGrid
          schedule={schedule}
          slots={slots}
          showClass={viewBy === 'faculty'}
          onFreeCell={(day, period) => setPanel({ mode: 'create', day, period })}
          onSlotClick={(slot) => setPanel({ mode: 'edit', slot })}
        />
        <NonStandardSlots slots={unplaced} showClass={viewBy === 'faculty'} onSlotClick={(slot) => setPanel({ mode: 'edit', slot })} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}
      {body}
      {panel && (
        <SidePanel title={panel.mode === 'create' ? 'Add Class' : 'Edit Class'} onClose={() => setPanel(null)} wide>
          <SlotForm
            key={panel.mode === 'edit' ? panel.slot.id : `new-${panel.day ?? ''}-${panel.period?.number ?? ''}`}
            schedule={schedule}
            slot={panel.mode === 'edit' ? panel.slot : undefined}
            offerings={panel.mode === 'edit' ? all : candidates}
            cohorts={batches.data}
            initialContext={panel.mode === 'create' && viewBy === 'class' ? ctx : undefined}
            initialDay={panel.mode === 'create' ? panel.day : undefined}
            initialPeriod={panel.mode === 'create' ? panel.period : undefined}
            onDone={() => setPanel(null)}
          />
        </SidePanel>
      )}
    </div>
  );
}

/**
 * Secondary admin/history view: the slots of ONE class as a list, including deleted and non-standard ones.
 * Follows the cohort-first rule — nothing is requested until a cohort, semester and section are chosen.
 */
function HodSlotList() {
  const offerings = useAllSubjectOfferings();
  const batches = useBatches();
  const staff = useStaffOptions();
  const periods = usePeriodSchedule();
  const [ctx, setCtx] = useState<AcademicContext>(EMPTY_CONTEXT);
  const [filters, setFilters] = useState({ staffId: '', dayOfWeek: '', showDeleted: false });
  const [editing, setEditing] = useState<TimetableSlot | null>(null);
  const all = useMemo(() => offerings.data ?? [], [offerings.data]);
  const schedule: Schedule = periods.data ?? [];
  const prompt = missingContext(ctx, 'section');

  // Cohort, semester, section, faculty, day and deleted run on the server; subject is applied here.
  const { data, isLoading, isError, error, isFetching } = useTimetableSlots({
    batchId: ctx.batchId ?? undefined,
    semester: ctx.semester ?? undefined,
    sectionId: ctx.sectionId ?? undefined,
    staffId: filters.staffId ? Number(filters.staffId) : undefined,
    dayOfWeek: (filters.dayOfWeek || undefined) as DayOfWeek | undefined,
    active: filters.showDeleted ? false : undefined,
  }, prompt === null);
  const rows = (data ?? [])
    .filter((s) => matchesContext(s, ctx))
    .sort((a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
  const set = (patch: Partial<typeof filters>) => setFilters({ ...filters, ...patch });

  let body;
  if (prompt) {
    body = (
      <ContextPrompt icon={<CalendarDays className="w-10 h-10" />}
        title={ctx.batchId === null ? 'Select a cohort, semester and section to view the timetable.' : prompt} />
    );
  } else if (isLoading || periods.isLoading) {
    body = <LoadingBlock label="Loading timetable..." />;
  } else if (isError || !data) {
    body = <ErrorBanner error={error} fallback="Unable to load the timetable." title="Error Loading Timetable" />;
  } else if (rows.length === 0) {
    body = <Card><EmptyBlock icon={<CalendarDays className="w-10 h-10" />} title="No timetable slots match these filters." /></Card>;
  } else {
    body = (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="col-fit">Day</TableHead>
              <TableHead className="col-fit">Time</TableHead>
              <TableHead className="col-fit">Period</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead className="col-fit">Room</TableHead>
              <TableHead className="col-fit">Type</TableHead>
              <TableHead className="col-fit text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => {
              const label = periodRangeLabel(schedule, s);
              return (
                <TableRow key={s.id}>
                  <TableCell>{DAY_LABELS[s.dayOfWeek]}</TableCell>
                  <TableCell>{formatTime(s.startTime)}–{formatTime(s.endTime)}</TableCell>
                  <TableCell>{label ?? <Badge variant="warning">Non-standard</Badge>}</TableCell>
                  <TableCell><span className="font-mono text-xs text-muted mr-1">{s.subjectCode}</span>{s.subjectName}</TableCell>
                  <TableCell className="text-muted">{s.staffName}</TableCell>
                  <TableCell className="text-muted">{s.room ?? '—'}</TableCell>
                  <TableCell className="text-muted">{SLOT_TYPE_LABELS[s.slotType]}</TableCell>
                  <TableCell className="text-right">
                    {s.active ? (
                      <Button variant="ghost" size="sm" aria-label={`Edit ${s.subjectCode} ${DAY_LABELS[s.dayOfWeek]} ${formatTime(s.startTime)}`} onClick={() => setEditing(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">Deleted</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AcademicContextFilter rows={all} value={ctx} onChange={setCtx} cohorts={batches.data} idPrefix="ttlist" disabled={offerings.isLoading}>
        <select aria-label="Faculty" className={SELECT_CLASS} value={filters.staffId} disabled={prompt !== null}
          onChange={(e) => set({ staffId: e.target.value })}>
          <option value="">All faculty</option>
          {(staff.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select aria-label="Day" className={SELECT_CLASS} value={filters.dayOfWeek} disabled={prompt !== null}
          onChange={(e) => set({ dayOfWeek: e.target.value })}>
          <option value="">All days</option>
          {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={filters.showDeleted} disabled={prompt !== null}
            onChange={(e) => set({ showDeleted: e.target.checked })} /> Deleted slots only
        </label>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </AcademicContextFilter>
      {body}
      {editing && periods.data && (
        <SidePanel title="Edit Class" onClose={() => setEditing(null)} wide>
          <SlotForm key={editing.id} schedule={periods.data} slot={editing} offerings={all} cohorts={batches.data} onDone={() => setEditing(null)} />
        </SidePanel>
      )}
    </div>
  );
}

function TimetableView() {
  const { hasRole } = useAuth();
  const isHod = hasRole('ROLE_HOD');
  const [tab, setTab] = useState<TimetableTab>('week');
  const items = isHod
    ? ([{ value: 'week', label: 'Weekly Schedule' }, { value: 'list', label: 'Slot List' }, { value: 'holidays', label: 'Holidays' }] as const)
    : ([{ value: 'week', label: 'Weekly Schedule' }, { value: 'holidays', label: 'Holidays' }] as const);

  return (
    <PageContainer contextArea={<Tabs label="Timetable sections" value={tab} onChange={setTab} items={items} className="!mb-0" />}>
      {tab === 'week' && (isHod ? <HodWeek /> : <MyTimetable isStaff={hasRole('ROLE_STAFF')} />)}
      {tab === 'list' && isHod && <HodSlotList />}
      {tab === 'holidays' && <HolidayCalendar />}
    </PageContainer>
  );
}

export default function TimetablePage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT']}>
      <TimetableView />
    </RequireRole>
  );
}
