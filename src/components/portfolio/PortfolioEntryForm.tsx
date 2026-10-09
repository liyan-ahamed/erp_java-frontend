'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FieldLabel, FormError } from '@/components/gradebook/shared';
import { TEXTAREA_CLASS } from '@/components/portfolio/shared';
import { useSavePortfolioEntry } from '@/hooks/usePortfolio';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  LEVELS,
  LEVEL_LABELS,
  MIN_SUBMIT_DESCRIPTION_LENGTH,
  isWebUrl,
} from '@/lib/portfolio-labels';
import { PortfolioActivityType, PortfolioEntry, PortfolioEntryRequest, PortfolioLevel } from '@/types/portfolio';

type FormState = Record<Exclude<keyof PortfolioEntryRequest, 'activityType' | 'level'>, string> & {
  activityType: PortfolioActivityType | '';
  level: PortfolioLevel | '';
};

const toForm = (entry?: PortfolioEntry): FormState => ({
  activityType: entry?.activityType ?? '',
  title: entry?.title ?? '',
  organization: entry?.organization ?? '',
  description: entry?.description ?? '',
  level: entry?.level ?? '',
  roleOrPosition: entry?.roleOrPosition ?? '',
  achievementResult: entry?.achievementResult ?? '',
  startDate: entry?.startDate ?? '',
  endDate: entry?.endDate ?? '',
  evidenceUrl: entry?.evidenceUrl ?? '',
});

const blankToNull = (value: string) => (value.trim() ? value.trim() : null);

/** Obvious mistakes only — the backend stays authoritative and its messages are shown as-is. */
const validate = (f: FormState): string[] => {
  const errors: string[] = [];
  if (!f.activityType) errors.push('Choose an activity type.');
  if (!f.title.trim()) errors.push('Title is required.');
  if (f.endDate && !f.startDate) errors.push('Add a start date when an end date is given.');
  if (f.startDate && f.endDate && f.endDate < f.startDate) errors.push('End date cannot be before the start date.');
  if (f.evidenceUrl.trim() && !isWebUrl(f.evidenceUrl.trim())) {
    errors.push('Evidence link must be a full http:// or https:// address.');
  }
  return errors;
};

/** Marks fields the backend requires before an entry can be submitted (not for a draft). */
const SubmitHint = () => <span className="normal-case tracking-normal font-normal text-[#9A9A9A]"> (needed to submit)</span>;

export function PortfolioEntryForm({ entry, onSaved }: { entry?: PortfolioEntry; onSaved: (entry: PortfolioEntry) => void }) {
  const [form, setForm] = useState<FormState>(() => toForm(entry));
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const save = useSavePortfolioEntry();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const errors = validate(form);
    setClientErrors(errors);
    if (errors.length) return;
    const payload: PortfolioEntryRequest = {
      activityType: form.activityType as PortfolioActivityType,
      title: form.title.trim(),
      organization: blankToNull(form.organization),
      description: blankToNull(form.description),
      level: form.level || null,
      roleOrPosition: blankToNull(form.roleOrPosition),
      achievementResult: blankToNull(form.achievementResult),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      evidenceUrl: blankToNull(form.evidenceUrl),
    };
    save.mutate({ id: entry?.id, payload }, { onSuccess: onSaved });
  };

  const descriptionLength = form.description.trim().length;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {entry?.status === 'REJECTED' && (
        <p className="text-xs text-[#666666] rounded-[10px] bg-[#FAFAFA] border border-[#E8E8E8] p-3">
          Saving keeps this entry in <strong>Needs Changes</strong>. Submit it again when you are ready for review.
        </p>
      )}

      <div className="space-y-1.5 flex flex-col">
        <FieldLabel htmlFor="pf-type">Activity Type *</FieldLabel>
        <select
          id="pf-type"
          value={form.activityType}
          onChange={(e) => set('activityType', e.target.value as PortfolioActivityType | '')}
          className={SELECT_CLASS}
          required
        >
          <option value="">Select type…</option>
          {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="pf-title">Title *</FieldLabel>
        <Input id="pf-title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} required />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="pf-org">Organization<SubmitHint /></FieldLabel>
        <Input
          id="pf-org"
          value={form.organization}
          onChange={(e) => set('organization', e.target.value)}
          maxLength={200}
          placeholder="Organizer, issuer, company or venue"
        />
      </div>

      <div className="space-y-1.5 flex flex-col">
        <FieldLabel htmlFor="pf-level">Level<SubmitHint /></FieldLabel>
        <select
          id="pf-level"
          value={form.level}
          onChange={(e) => set('level', e.target.value as PortfolioLevel | '')}
          className={SELECT_CLASS}
        >
          <option value="">Select level…</option>
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="pf-desc">Description<SubmitHint /></FieldLabel>
        <textarea
          id="pf-desc"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          maxLength={2000}
          rows={5}
          className={TEXTAREA_CLASS}
          placeholder="What you did and what came out of it"
        />
        <p className="text-xs text-[#9A9A9A]">
          {descriptionLength}/2000 · at least {MIN_SUBMIT_DESCRIPTION_LENGTH} characters to submit
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="pf-role">Role / Position</FieldLabel>
          <Input id="pf-role" value={form.roleOrPosition} onChange={(e) => set('roleOrPosition', e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="pf-result">Achievement / Result</FieldLabel>
          <Input
            id="pf-result"
            value={form.achievementResult}
            onChange={(e) => set('achievementResult', e.target.value)}
            maxLength={150}
            placeholder="e.g. Winner, Finalist"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="pf-start">Start Date<SubmitHint /></FieldLabel>
          <Input id="pf-start" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="pf-end">End Date</FieldLabel>
          <Input id="pf-end" type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="pf-evidence">Evidence Link</FieldLabel>
        <Input
          id="pf-evidence"
          type="url"
          value={form.evidenceUrl}
          onChange={(e) => set('evidenceUrl', e.target.value)}
          maxLength={500}
          placeholder="https://… (certificate, publication, event page)"
        />
        <p className="text-xs text-[#9A9A9A]">Paste a link to the certificate or proof. File uploads are not supported.</p>
      </div>

      {clientErrors.length > 0 && (
        <ul className="rounded-[10px] bg-red-50 p-3 text-sm text-red-600 border border-red-100 list-disc pl-6" role="alert">
          {clientErrors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      {save.isError && <FormError error={save.error} fallback="Unable to save this entry." />}

      <Button type="submit" className="w-full" isLoading={save.isPending}>
        {entry ? 'Save Changes' : 'Save as Draft'}
      </Button>
    </form>
  );
}
