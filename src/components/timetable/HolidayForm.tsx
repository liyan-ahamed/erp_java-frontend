'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FieldLabel, FormError } from '@/components/gradebook/shared';
import { TEXTAREA_CLASS } from '@/components/portfolio/shared';
import { useBatches } from '@/hooks/useAcademic';
import { useSaveHoliday } from '@/hooks/useHolidays';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import { cohortLabel, sortCohorts } from '@/lib/academic-context';
import { holidayCategoryLabel, holidayFormProblem } from '@/lib/holidays';
import { Holiday, HolidayRequest, WRITABLE_HOLIDAY_CATEGORIES } from '@/types/holiday';

/** HOD: add or edit one college holiday. Saving a holiday in a year with no calendar starts a draft. */
export function HolidayForm({ holiday, defaultDate, onSaved }: { holiday?: Holiday; defaultDate?: string; onSaved: (saved: Holiday) => void }) {
  const batches = useBatches();
  const save = useSaveHoliday();
  const [form, setForm] = useState<HolidayRequest>(
    holiday
      ? { name: holiday.name, startDate: holiday.startDate, endDate: holiday.endDate, category: holiday.category, description: holiday.description, batchIds: holiday.batchIds }
      : { name: '', startDate: defaultDate ?? '', endDate: null, category: 'INSTITUTIONAL', description: null, batchIds: [] },
  );
  const [problem, setProblem] = useState('');
  // Existing GENERAL_HOLIDAY rows keep their category; new entries use the writable categories.
  const categories: string[] = [...WRITABLE_HOLIDAY_CATEGORIES];
  if (holiday && !categories.includes(holiday.category)) categories.unshift(holiday.category);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: HolidayRequest = {
      ...form,
      name: form.name.trim(),
      endDate: form.endDate && form.endDate !== form.startDate ? form.endDate : null,
      description: form.description?.trim() ? form.description.trim() : null,
    };
    const found = holidayFormProblem(payload);
    setProblem(found ?? '');
    if (found) return;
    save.mutate({ id: holiday?.id, payload }, { onSuccess: (saved) => onSaved(saved as Holiday) });
  };

  const toggleCohort = (id: number) =>
    setForm({ ...form, batchIds: form.batchIds.includes(id) ? form.batchIds.filter((b) => b !== id) : [...form.batchIds, id] });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="holiday-name">Holiday name *</FieldLabel>
        <Input id="holiday-name" value={form.name} maxLength={150} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="holiday-start">Start date *</FieldLabel>
          <Input id="holiday-start" type="date" value={form.startDate} required onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="holiday-end">End date</FieldLabel>
          <Input id="holiday-end" type="date" value={form.endDate ?? ''} min={form.startDate || undefined}
            onChange={(e) => setForm({ ...form, endDate: e.target.value || null })} />
          <p className="text-[11px] text-muted">Leave empty for a one-day holiday.</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="holiday-category">Category *</FieldLabel>
        <select id="holiday-category" className={`${SELECT_CLASS} w-full`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {categories.map((c) => <option key={c} value={c}>{holidayCategoryLabel(c)}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="holiday-description">Description</FieldLabel>
        <textarea id="holiday-description" rows={3} maxLength={500} className={TEXTAREA_CLASS} value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <fieldset className="space-y-1.5">
        <legend className="f-label">Applies to</legend>
        <p className="text-[11px] text-muted">Leave every cohort unticked for the whole institution.</p>
        {batches.isLoading ? (
          <p className="text-[12px] text-muted">Loading cohorts…</p>
        ) : batches.isError ? (
          <p className="text-[12px] text-danger">Cohorts couldn&apos;t be loaded; the holiday will apply to {form.batchIds.length ? 'the cohorts already chosen' : 'the whole institution'}.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {sortCohorts(batches.data ?? []).map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={form.batchIds.includes(b.id)} onChange={() => toggleCohort(b.id)} />
                {cohortLabel(b)}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
      {save.isError && <FormError error={save.error} fallback="Unable to save the holiday." />}
      <Button type="submit" className="w-full" isLoading={save.isPending}>{holiday ? 'Save Changes' : 'Add Holiday'}</Button>
    </form>
  );
}
