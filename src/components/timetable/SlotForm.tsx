'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Trash2 } from '@/components/ui/icons';
import { FieldLabel, FormError } from '@/components/gradebook/shared';
import { ConfirmBox } from '@/components/portfolio/shared';
import { OfferingPicker } from '@/components/academic/AcademicContextFilter';
import { useDeleteTimetableSlot, useSaveTimetableSlot } from '@/hooks/useTimetable';
import { Period, Schedule, periodsOf, placeSlot } from '@/lib/academic-periods';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import { DAYS, DAY_LABELS, SLOT_TYPES, SLOT_TYPE_LABELS, formatTime } from '@/lib/erp-labels';
import { DayOfWeek, TimetableSlot, TimetableSlotRequest, TimetableSlotType } from '@/types/timetable';
import { SubjectOffering } from '@/types/gradebook';
import { Batch } from '@/types/academic';
import { AcademicContext } from '@/lib/academic-context';

const toTime = (value: string) => value.slice(0, 5);

interface SlotFormProps {
  /** The institution's daily schedule from the backend. */
  schedule: Schedule;
  slot?: TimetableSlot;
  /** Class courses the slot can belong to (already narrowed to the current class or faculty when known). */
  offerings: SubjectOffering[];
  cohorts?: Batch[];
  /** New slot: the class being viewed, and the day and period of a clicked grid cell. */
  initialContext?: AcademicContext;
  initialDay?: DayOfWeek;
  initialPeriod?: Period;
  onDone: () => void;
}

/**
 * Create or edit a timetable slot. Times normally come from the standard periods (one period, or a
 * range for labs); "Custom times" keeps support for slots outside them. The backend rejects overlaps (409).
 */
export function SlotForm({ schedule, slot, offerings, cohorts, initialContext, initialDay, initialPeriod, onDone }: SlotFormProps) {
  const save = useSaveTimetableSlot();
  const remove = useDeleteTimetableSlot();
  const PERIODS = periodsOf(schedule);
  const place = slot ? placeSlot(schedule, slot) : null;
  const firstOf = (s: TimetableSlot) => PERIODS.find((p) => p.start === toTime(s.startTime));
  const lastOf = (s: TimetableSlot) => PERIODS.find((p) => p.end === toTime(s.endTime));

  const [offeringId, setOfferingId] = useState<number | null>(slot?.subjectOfferingId ?? null);
  const [form, setForm] = useState({
    dayOfWeek: (slot?.dayOfWeek ?? initialDay ?? 'MONDAY') as DayOfWeek,
    custom: !!slot && !place,
    fromPeriod: String((slot && place ? firstOf(slot)?.number : initialPeriod?.number) ?? ''),
    toPeriod: String((slot && place ? lastOf(slot)?.number : initialPeriod?.number) ?? ''),
    periodNumber: slot?.periodNumber ? String(slot.periodNumber) : '',
    startTime: slot ? toTime(slot.startTime) : '',
    endTime: slot ? toTime(slot.endTime) : '',
    room: slot?.room ?? '',
    slotType: (slot?.slotType ?? 'LECTURE') as TimetableSlotType,
  });
  const [problem, setProblem] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<typeof form>) => { setForm((old) => ({ ...old, ...patch })); setProblem(''); };

  // Keep the course's own record selectable when editing, even if it's now inactive.
  const candidates = offerings.filter((o) => o.active || o.id === slot?.subjectOfferingId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!offeringId) return setProblem('Choose the cohort, semester, section and subject.');
    let startTime: string, endTime: string, periodNumber: number | null;
    if (form.custom) {
      if (!form.startTime || !form.endTime) return setProblem('Start time and end time are required.');
      if (form.startTime >= form.endTime) return setProblem('Start time must be before end time.');
      if (form.periodNumber && !(Number.isInteger(Number(form.periodNumber)) && Number(form.periodNumber) > 0)) return setProblem('Period must be a positive whole number.');
      startTime = form.startTime;
      endTime = form.endTime;
      periodNumber = form.periodNumber ? Number(form.periodNumber) : null;
    } else {
      const from = PERIODS.find((p) => p.number === Number(form.fromPeriod));
      const to = PERIODS.find((p) => p.number === Number(form.toPeriod));
      if (!from || !to) return setProblem('Choose the period (or the first and last period for a lab).');
      if (to.number < from.number) return setProblem('The last period can’t be before the first one.');
      startTime = from.start;
      endTime = to.end;
      periodNumber = from.number;
    }
    const payload: TimetableSlotRequest = {
      subjectOfferingId: offeringId,
      dayOfWeek: form.dayOfWeek,
      periodNumber,
      startTime,
      endTime,
      room: form.room.trim() || null,
      slotType: form.slotType,
    };
    save.mutate({ id: slot?.id, payload }, { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <OfferingPicker rows={candidates} value={offeringId} onChange={(o) => { setOfferingId(o?.id ?? null); setProblem(''); }}
        initialContext={initialContext} cohorts={cohorts} stacked idPrefix="slot" />
      {offeringId !== null && (
        <p className="text-[12px] text-muted">
          Faculty: <span className="text-fg">{candidates.find((o) => o.id === offeringId)?.staffName ?? '—'}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="slot-day">Day</FieldLabel>
          <select id="slot-day" className={`${SELECT_CLASS} w-full`} value={form.dayOfWeek} onChange={(e) => set({ dayOfWeek: e.target.value as DayOfWeek })}>
            {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="slot-type">Type</FieldLabel>
          <select id="slot-type" className={`${SELECT_CLASS} w-full`} value={form.slotType} onChange={(e) => set({ slotType: e.target.value as TimetableSlotType })}>
            {SLOT_TYPES.map((t) => <option key={t} value={t}>{SLOT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        {form.custom ? (
          <>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="slot-start">Start Time</FieldLabel>
              <Input id="slot-start" type="time" required value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="slot-end">End Time</FieldLabel>
              <Input id="slot-end" type="time" required value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="slot-period">Period number (optional)</FieldLabel>
              <Input id="slot-period" type="number" min={1} value={form.periodNumber} onChange={(e) => set({ periodNumber: e.target.value })} />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="slot-from">Period</FieldLabel>
              <select id="slot-from" className={`${SELECT_CLASS} w-full`} value={form.fromPeriod}
                onChange={(e) => set({ fromPeriod: e.target.value, toPeriod: !form.toPeriod || Number(form.toPeriod) < Number(e.target.value) ? e.target.value : form.toPeriod })}>
                <option value="">Select period</option>
                {PERIODS.map((p) => <option key={p.number} value={p.number}>P{p.number} · {p.start}–{p.end}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="slot-to">Until (labs)</FieldLabel>
              <select id="slot-to" className={`${SELECT_CLASS} w-full`} value={form.toPeriod} disabled={!form.fromPeriod} onChange={(e) => set({ toPeriod: e.target.value })}>
                {PERIODS.filter((p) => !form.fromPeriod || p.number >= Number(form.fromPeriod)).map((p) => (
                  <option key={p.number} value={p.number}>{p.number === Number(form.fromPeriod) ? 'Same period' : `P${p.number} · ends ${p.end}`}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <FieldLabel htmlFor="slot-room">Room (optional)</FieldLabel>
          <Input id="slot-room" maxLength={50} value={form.room} onChange={(e) => set({ room: e.target.value })} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[12px] text-muted">
        <input type="checkbox" checked={form.custom} onChange={(e) => set({ custom: e.target.checked })} />
        Custom times (outside the standard periods)
      </label>
      {slot && !place && (
        <p className="text-[11px] text-warn">
          This slot ({formatTime(slot.startTime)}–{formatTime(slot.endTime)}) doesn&apos;t match the standard periods, so it isn&apos;t drawn on the weekly grid.
        </p>
      )}

      {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
      {save.isError && <FormError error={save.error} fallback="Unable to save the timetable slot." />}
      {remove.isError && <FormError error={remove.error} fallback="Unable to delete the slot." />}
      <p className="text-[11px] text-muted">The backend rejects slots that overlap the same section or the same faculty member on that day.</p>

      {confirmDelete && slot ? (
        <ConfirmBox
          message={<>Delete this {DAY_LABELS[slot.dayOfWeek]} {formatTime(slot.startTime)}–{formatTime(slot.endTime)} class of <strong>{slot.subjectCode}</strong> (Sec {slot.sectionName})? The slot is deactivated, not erased.</>}
          confirmLabel="Delete Slot"
          variant="danger"
          isLoading={remove.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => remove.mutate(slot.id, { onSuccess: onDone })}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" isLoading={save.isPending}>{slot ? 'Save Changes' : 'Add Class'}</Button>
          {slot?.active && (
            <Button type="button" variant="danger" onClick={() => { remove.reset(); setConfirmDelete(true); }}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
