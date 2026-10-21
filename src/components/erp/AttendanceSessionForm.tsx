'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { FieldLabel, FormError } from '@/components/gradebook/shared';
import { TeachingSelector } from '@/components/academic/TeachingSelector';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import { useBatches } from '@/hooks/useAcademic';
import { ClassRow, TeachingSelection, resolveSelection } from '@/lib/teaching-context';
import { useTimetableSlots } from '@/hooks/useTimetable';
import { useSaveAttendanceSession } from '@/hooks/useAttendance';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import { DAY_LABELS, SLOT_TYPE_LABELS, dayOfDate, formatTime, todayIso } from '@/lib/erp-labels';
import { AttendanceSession } from '@/types/attendance';

/**
 * Create (STAFF, own active offerings) or edit (DRAFT only) an attendance session.
 * The timetable slot is optional; when chosen, the backend fills the period from it.
 */
const isActive = (r: ClassRow) => r.active;

export function AttendanceSessionForm({ session, onSaved }: { session?: AttendanceSession; onSaved: (s: AttendanceSession) => void }) {
  const offerings = useAllSubjectOfferings(!session);
  const batches = useBatches(!session);
  const [pick, setPick] = useState<TeachingSelection | null>(null);
  const save = useSaveAttendanceSession();
  const [form, setForm] = useState({
    attendanceDate: session?.attendanceDate ?? todayIso(),
    timetableSlotId: session?.timetableSlotId ? String(session.timetableSlotId) : '',
    periodNumber: session?.periodNumber ? String(session.periodNumber) : '',
    topic: session?.topic ?? '',
  });
  const [problem, setProblem] = useState('');
  const set = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setProblem(''); };

  // Create: Batch → Semester → Class over the teacher's active classes. Edit: the session's own class.
  const selection = resolveSelection(pick ?? { batchId: null, semester: null, offeringId: null }, offerings.data ?? [], batches.data);
  const offeringId = session ? session.subjectOfferingId : (offerings.data ?? []).some((o) => o.active && o.id === selection.offeringId) ? selection.offeringId : null;
  const slots = useTimetableSlots({ subjectOfferingId: offeringId ?? undefined }, offeringId !== null);
  const day = dayOfDate(form.attendanceDate);
  const daySlots = (slots.data ?? []).filter((s) => s.dayOfWeek === day);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!offeringId || !form.attendanceDate) return setProblem('Choose the class (batch, semester and class) and the date.');
    if (form.attendanceDate > todayIso()) return setProblem('Attendance date cannot be in the future.');
    if (form.periodNumber && !(Number.isInteger(Number(form.periodNumber)) && Number(form.periodNumber) > 0)) {
      return setProblem('Period must be a positive whole number.');
    }
    const common = {
      attendanceDate: form.attendanceDate,
      timetableSlotId: form.timetableSlotId ? Number(form.timetableSlotId) : null,
      periodNumber: form.periodNumber ? Number(form.periodNumber) : null,
      topic: form.topic.trim() || null,
    };
    if (session) save.mutate({ id: session.id, payload: common }, { onSuccess: onSaved });
    else save.mutate({ payload: { subjectOfferingId: offeringId, ...common } }, { onSuccess: onSaved });
  };

  if (!session && offerings.isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;
  if (!session && offerings.isError) return <FormError error={offerings.error} fallback="Unable to load your courses." />;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        {session ? (
          <>
            <FieldLabel>Course</FieldLabel>
            <p className="text-sm text-fg">{session.subjectCode} — {session.subjectName} (Sec {session.sectionName})</p>
          </>
        ) : (
          <TeachingSelector rows={offerings.data ?? []} batches={batches.data} value={{ ...selection, offeringId }} classMode="required"
            classFilter={isActive} stacked idPrefix="session"
            onChange={(next) => { setPick(next); set({ timetableSlotId: '' }); }} />
        )}
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="session-date">Date</FieldLabel>
        <Input id="session-date" type="date" max={todayIso()} value={form.attendanceDate}
          onChange={(e) => set({ attendanceDate: e.target.value, timetableSlotId: '' })} />
      </div>
      {offeringId !== null && (
        <div className="space-y-1.5">
          <FieldLabel htmlFor="session-slot">Timetable Slot (optional)</FieldLabel>
          {slots.isLoading ? <Spinner size="sm" /> : (
            <select id="session-slot" className={`${SELECT_CLASS} w-full`} value={form.timetableSlotId}
              onChange={(e) => {
                const slot = daySlots.find((s) => s.id === Number(e.target.value));
                set({ timetableSlotId: e.target.value, periodNumber: slot?.periodNumber ? String(slot.periodNumber) : form.periodNumber });
              }}>
              <option value="">{daySlots.length ? 'None' : `No slots on ${day ? DAY_LABELS[day] : 'this day'}`}</option>
              {daySlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatTime(s.startTime)}–{formatTime(s.endTime)}{s.periodNumber ? ` · Period ${s.periodNumber}` : ''} · {SLOT_TYPE_LABELS[s.slotType]}{s.room ? ` · ${s.room}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="session-period">Period (optional)</FieldLabel>
        <Input id="session-period" type="number" min={1} value={form.periodNumber} onChange={(e) => set({ periodNumber: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="session-topic">Topic (optional)</FieldLabel>
        <Input id="session-topic" maxLength={255} value={form.topic} onChange={(e) => set({ topic: e.target.value })} />
      </div>
      {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
      {save.isError && <FormError error={save.error} fallback="Unable to save the session." />}
      <Button type="submit" isLoading={save.isPending}>{session ? 'Save Changes' : 'Create Session'}</Button>
    </form>
  );
}
