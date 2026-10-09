'use client';

import { FormEvent, useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, FieldLabel, FormError, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { ConfirmBox } from '@/components/portfolio/shared';
import { FilterBar, ReadOnlyNote, offeringOptionLabel } from '@/components/erp/shared';
import { WeeklyTimetable } from '@/components/erp/WeeklyTimetable';
import { useAuth } from '@/contexts/auth-context';
import { useSections } from '@/hooks/useAcademic';
import { useAllSubjectOfferings, useStaffOptions } from '@/hooks/useGradebook';
import { useDeleteTimetableSlot, useMyTimetable, useSaveTimetableSlot, useTimetableSlots } from '@/hooks/useTimetable';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import { DAYS, DAY_LABELS, SLOT_TYPES, SLOT_TYPE_LABELS, formatTime } from '@/lib/erp-labels';
import { DayOfWeek, TimetableSlot, TimetableSlotRequest, TimetableSlotType } from '@/types/timetable';

// ---------- STUDENT / STAFF ----------

function MyTimetable({ isStaff }: { isStaff: boolean }) {
  const { data, isLoading, isError, error } = useMyTimetable();
  if (isLoading) return <LoadingBlock label="Loading timetable..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load the timetable." title="Error Loading Timetable" />;
  if (data.length === 0) {
    return <Card><EmptyBlock icon={<CalendarDays className="w-10 h-10" />} title="No timetable available." hint={isStaff ? 'Slots appear here once the HOD schedules your offerings.' : 'Slots appear here once your enrolled subjects are scheduled.'} /></Card>;
  }
  return (
    <div className="space-y-4">
      {isStaff && <ReadOnlyNote>Your teaching timetable. Timetable changes are made by the HOD.</ReadOnlyNote>}
      <WeeklyTimetable slots={data} showClass={isStaff} hideFaculty={isStaff} />
    </div>
  );
}

// ---------- HOD ----------

const toTime = (value: string) => value.slice(0, 5);

function SlotForm({ slot, onSaved }: { slot?: TimetableSlot; onSaved: () => void }) {
  const offerings = useAllSubjectOfferings();
  const save = useSaveTimetableSlot();
  const [form, setForm] = useState({
    subjectOfferingId: slot ? String(slot.subjectOfferingId) : '',
    dayOfWeek: (slot?.dayOfWeek ?? 'MONDAY') as DayOfWeek,
    periodNumber: slot?.periodNumber ? String(slot.periodNumber) : '',
    startTime: slot ? toTime(slot.startTime) : '',
    endTime: slot ? toTime(slot.endTime) : '',
    room: slot?.room ?? '',
    slotType: (slot?.slotType ?? 'LECTURE') as TimetableSlotType,
  });
  const [problem, setProblem] = useState('');
  const set = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setProblem(''); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.subjectOfferingId || !form.startTime || !form.endTime) return setProblem('Subject offering, start time and end time are required.');
    if (form.startTime >= form.endTime) return setProblem('Start time must be before end time.');
    if (form.periodNumber && !(Number.isInteger(Number(form.periodNumber)) && Number(form.periodNumber) > 0)) return setProblem('Period must be a positive whole number.');
    const payload: TimetableSlotRequest = {
      subjectOfferingId: Number(form.subjectOfferingId),
      dayOfWeek: form.dayOfWeek,
      periodNumber: form.periodNumber ? Number(form.periodNumber) : null,
      startTime: form.startTime,
      endTime: form.endTime,
      room: form.room.trim() || null,
      slotType: form.slotType,
    };
    save.mutate({ id: slot?.id, payload }, { onSuccess: onSaved });
  };

  if (offerings.isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;
  if (offerings.isError) return <FormError error={offerings.error} fallback="Unable to load subject offerings." />;
  const options = (offerings.data ?? []).filter((o) => o.active || o.id === slot?.subjectOfferingId);

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="slot-offering">Subject Offering</FieldLabel>
        <select id="slot-offering" required className={`${SELECT_CLASS} w-full`} value={form.subjectOfferingId} onChange={(e) => set({ subjectOfferingId: e.target.value })}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)} — {o.staffName}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="slot-day">Day</FieldLabel>
          <select id="slot-day" className={`${SELECT_CLASS} w-full`} value={form.dayOfWeek} onChange={(e) => set({ dayOfWeek: e.target.value as DayOfWeek })}>
            {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="slot-period">Period (optional)</FieldLabel>
          <Input id="slot-period" type="number" min={1} value={form.periodNumber} onChange={(e) => set({ periodNumber: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="slot-start">Start Time</FieldLabel>
          <Input id="slot-start" type="time" required value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="slot-end">End Time</FieldLabel>
          <Input id="slot-end" type="time" required value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="slot-room">Room (optional)</FieldLabel>
          <Input id="slot-room" maxLength={50} value={form.room} onChange={(e) => set({ room: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="slot-type">Type</FieldLabel>
          <select id="slot-type" className={`${SELECT_CLASS} w-full`} value={form.slotType} onChange={(e) => set({ slotType: e.target.value as TimetableSlotType })}>
            {SLOT_TYPES.map((t) => <option key={t} value={t}>{SLOT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
      </div>
      {problem && <p className="text-sm text-red-600" role="alert">{problem}</p>}
      {save.isError && <FormError error={save.error} fallback="Unable to save the timetable slot." />}
      <p className="text-[11px] text-[#9A9A9A]">The backend rejects slots that overlap the same section or the same staff member on that day.</p>
      <Button type="submit" isLoading={save.isPending}>{slot ? 'Save Changes' : 'Create Slot'}</Button>
    </form>
  );
}

type Panel = { mode: 'create' } | { mode: 'edit'; slot: TimetableSlot } | null;

function TimetableManagement() {
  const sections = useSections(null);
  const staff = useStaffOptions();
  const offerings = useAllSubjectOfferings();
  const [filters, setFilters] = useState({ sectionId: '', staffId: '', dayOfWeek: '', subjectOfferingId: '', showDeleted: false });
  const [view, setView] = useState<'list' | 'week'>('list');
  const [panel, setPanel] = useState<Panel>(null);
  const [deleting, setDeleting] = useState<TimetableSlot | null>(null);
  const remove = useDeleteTimetableSlot();

  const { data, isLoading, isError, error, isFetching } = useTimetableSlots({
    sectionId: filters.sectionId ? Number(filters.sectionId) : undefined,
    staffId: filters.staffId ? Number(filters.staffId) : undefined,
    dayOfWeek: (filters.dayOfWeek || undefined) as DayOfWeek | undefined,
    subjectOfferingId: filters.subjectOfferingId ? Number(filters.subjectOfferingId) : undefined,
    active: filters.showDeleted ? false : undefined,
  });
  const set = (patch: Partial<typeof filters>) => setFilters({ ...filters, ...patch });

  const toolbar = (
    <div className="space-y-3">
      <FilterBar>
        <select aria-label="Filter by section" className={SELECT_CLASS} value={filters.sectionId} onChange={(e) => set({ sectionId: e.target.value })}>
          <option value="">All Sections</option>
          {(sections.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.batchName} — Sec {s.name}</option>)}
        </select>
        <select aria-label="Filter by staff" className={SELECT_CLASS} value={filters.staffId} onChange={(e) => set({ staffId: e.target.value })}>
          <option value="">All Staff</option>
          {(staff.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select aria-label="Filter by day" className={SELECT_CLASS} value={filters.dayOfWeek} onChange={(e) => set({ dayOfWeek: e.target.value })}>
          <option value="">All Days</option>
          {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
        </select>
        <select aria-label="Filter by subject offering" className={SELECT_CLASS} value={filters.subjectOfferingId} onChange={(e) => set({ subjectOfferingId: e.target.value })}>
          <option value="">All Offerings</option>
          {(offerings.data ?? []).map((o) => <option key={o.id} value={o.id}>{offeringOptionLabel(o)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-[#666666]">
          <input type="checkbox" checked={filters.showDeleted} onChange={(e) => set({ showDeleted: e.target.checked })} /> Show deleted slots only
        </label>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </FilterBar>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setPanel({ mode: 'create' })}><Plus className="w-4 h-4 mr-1.5" /> New Slot</Button>
        <div className="inline-flex rounded-[10px] border border-[#E8E8E8] overflow-hidden" role="group" aria-label="View">
          <button className={`px-3 h-8 text-xs font-medium ${view === 'list' ? 'bg-[#111111] text-white' : 'bg-white text-[#666666]'}`} aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
          <button className={`px-3 h-8 text-xs font-medium ${view === 'week' ? 'bg-[#111111] text-white' : 'bg-white text-[#666666]'}`} aria-pressed={view === 'week'} onClick={() => setView('week')}>Week</button>
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer contextArea={toolbar} rawLayout>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full space-y-3">
          {remove.isError && <FormError error={remove.error} fallback="Unable to delete the slot." />}
          {deleting && (
            <ConfirmBox
              message={<>Delete the {DAY_LABELS[deleting.dayOfWeek]} {formatTime(deleting.startTime)}–{formatTime(deleting.endTime)} slot of <strong>{deleting.subjectCode}</strong> (Sec {deleting.sectionName})? The slot is deactivated, not erased.</>}
              confirmLabel="Delete Slot"
              variant="danger"
              isLoading={remove.isPending}
              onCancel={() => setDeleting(null)}
              onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            />
          )}
          {isLoading ? (
            <LoadingBlock label="Loading timetable..." />
          ) : isError || !data ? (
            <ErrorBanner error={error} fallback="Unable to load the timetable." title="Error Loading Timetable" />
          ) : data.length === 0 ? (
            <Card><EmptyBlock icon={<CalendarDays className="w-10 h-10" />} title="No timetable available." hint="No slots match these filters." /></Card>
          ) : view === 'week' ? (
            <WeeklyTimetable slots={data} showClass />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">{DAY_LABELS[s.dayOfWeek]}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatTime(s.startTime)}–{formatTime(s.endTime)}</TableCell>
                      <TableCell className="text-[#666666]">{s.periodNumber ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap"><span className="font-mono text-xs text-[#9A9A9A] mr-1">{s.subjectCode}</span>{s.subjectName}</TableCell>
                      <TableCell className="text-[#666666] whitespace-nowrap">{s.batchName} Sec {s.sectionName}</TableCell>
                      <TableCell className="text-[#666666] whitespace-nowrap">{s.staffName}</TableCell>
                      <TableCell className="text-[#666666]">{s.room ?? '—'}</TableCell>
                      <TableCell className="text-[#666666]">{SLOT_TYPE_LABELS[s.slotType]}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {s.active ? (
                          <>
                            <Button variant="ghost" size="sm" aria-label={`Edit ${s.subjectCode} ${DAY_LABELS[s.dayOfWeek]} ${formatTime(s.startTime)}`} onClick={() => setPanel({ mode: 'edit', slot: s })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label={`Delete ${s.subjectCode} ${DAY_LABELS[s.dayOfWeek]} ${formatTime(s.startTime)}`} onClick={() => { remove.reset(); setDeleting(s); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-[#9A9A9A]">Deleted</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
        {panel && (
          <SidePanel title={panel.mode === 'create' ? 'New Timetable Slot' : 'Edit Timetable Slot'} onClose={() => setPanel(null)}>
            <SlotForm key={panel.mode === 'edit' ? panel.slot.id : 'new'} slot={panel.mode === 'edit' ? panel.slot : undefined} onSaved={() => setPanel(null)} />
          </SidePanel>
        )}
      </div>
    </PageContainer>
  );
}

function TimetableView() {
  const { hasRole } = useAuth();
  if (hasRole('ROLE_HOD')) return <TimetableManagement />;
  return <PageContainer rawLayout><MyTimetable isStaff={hasRole('ROLE_STAFF')} /></PageContainer>;
}

export default function TimetablePage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT']}>
      <TimetableView />
    </RequireRole>
  );
}
