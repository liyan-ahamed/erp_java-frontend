'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { FieldLabel, FormError } from '@/components/gradebook/shared';
import { useAllSubjectOfferings, useCreateAssessment, useUpdateAssessment } from '@/hooks/useGradebook';
import { ASSESSMENT_TYPES, ASSESSMENT_TYPE_LABELS, SELECT_CLASS, offeringLabel } from '@/lib/gradebook-labels';
import { Assessment, AssessmentType, UpdateAssessmentRequest } from '@/types/gradebook';

interface FormState {
  subjectOfferingId: string;
  title: string;
  assessmentType: AssessmentType | '';
  maxMarks: string;
  passMarks: string;
  weightage: string;
  assessmentDate: string;
}

const toForm = (a?: Assessment): FormState => ({
  subjectOfferingId: a ? String(a.subjectOfferingId) : '',
  title: a?.title ?? '',
  assessmentType: a?.assessmentType ?? '',
  maxMarks: a ? String(Number(a.maxMarks)) : '',
  passMarks: a?.passMarks !== null && a?.passMarks !== undefined ? String(Number(a.passMarks)) : '',
  weightage: a?.weightage !== null && a?.weightage !== undefined ? String(Number(a.weightage)) : '',
  assessmentDate: a?.assessmentDate ?? '',
});

/** Light checks for obvious mistakes; the backend stays authoritative. */
const validate = (f: FormState): string | null => {
  const max = Number(f.maxMarks);
  if (!(max > 0) || max > 1000) return 'Max marks must be more than 0 and at most 1000.';
  if (f.passMarks !== '') {
    const pass = Number(f.passMarks);
    if (pass < 0) return 'Pass marks cannot be negative.';
    if (pass > max) return 'Pass marks cannot exceed max marks.';
  }
  if (f.weightage !== '') {
    const w = Number(f.weightage);
    if (!(w > 0) || w > 100) return 'Weightage must be more than 0 and at most 100.';
  }
  return null;
};

/**
 * Create (STAFF, own active offerings only) or edit a DRAFT assessment.
 * Weightage is stored as entered — nothing is calculated from it.
 */
export function AssessmentForm({ assessment, onSaved }: { assessment?: Assessment; onSaved: (a: Assessment) => void }) {
  const isEdit = !!assessment;
  const [form, setForm] = useState<FormState>(toForm(assessment));
  const [localError, setLocalError] = useState('');
  const offerings = useAllSubjectOfferings(!isEdit);
  const create = useCreateAssessment();
  const update = useUpdateAssessment();
  const mutation = isEdit ? update : create;

  const activeOfferings = offerings.data?.filter((o) => o.active) ?? [];

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((old) => ({ ...old, [field]: e.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validate(form);
    setLocalError(problem ?? '');
    if (problem) return;

    const payload: UpdateAssessmentRequest = {
      title: form.title.trim(),
      assessmentType: form.assessmentType as AssessmentType,
      maxMarks: Number(form.maxMarks),
      passMarks: form.passMarks === '' ? undefined : Number(form.passMarks),
      weightage: form.weightage === '' ? undefined : Number(form.weightage),
      assessmentDate: form.assessmentDate,
    };
    if (assessment) {
      update.mutate({ id: assessment.id, payload }, { onSuccess: onSaved });
    } else {
      create.mutate({ ...payload, subjectOfferingId: Number(form.subjectOfferingId) }, { onSuccess: onSaved });
    }
  };

  if (!isEdit && offerings.isLoading) {
    return <div className="py-10 flex justify-center"><Spinner size="lg" /></div>;
  }
  if (!isEdit && offerings.isError) {
    return <FormError error={offerings.error} fallback="Unable to load your subject offerings." />;
  }
  if (!isEdit && activeOfferings.length === 0) {
    return <p className="text-sm text-[#666666]">No active subject offerings assigned to you.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {isEdit ? (
        <p className="text-xs text-[#666666]">{offeringLabel(assessment)}</p>
      ) : (
        <div className="space-y-1.5 flex flex-col">
          <FieldLabel htmlFor="assessment-offering">Subject Offering *</FieldLabel>
          <select
            id="assessment-offering"
            required
            value={form.subjectOfferingId}
            onChange={set('subjectOfferingId')}
            className={SELECT_CLASS}
          >
            <option value="">Select offering</option>
            {activeOfferings.map((o) => <option key={o.id} value={o.id}>{offeringLabel(o)}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="assessment-title">Title *</FieldLabel>
        <Input id="assessment-title" required maxLength={150} value={form.title} onChange={set('title')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 flex flex-col">
          <FieldLabel htmlFor="assessment-type">Type *</FieldLabel>
          <select id="assessment-type" required value={form.assessmentType} onChange={set('assessmentType')} className={SELECT_CLASS}>
            <option value="">Select type</option>
            {ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{ASSESSMENT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="assessment-date">Date *</FieldLabel>
          <Input id="assessment-date" type="date" required value={form.assessmentDate} onChange={set('assessmentDate')} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="assessment-max">Max Marks *</FieldLabel>
          <Input id="assessment-max" type="number" required min={0.01} max={1000} step={0.01} value={form.maxMarks} onChange={set('maxMarks')} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="assessment-pass">Pass Marks</FieldLabel>
          <Input id="assessment-pass" type="number" min={0} step={0.01} value={form.passMarks} onChange={set('passMarks')} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="assessment-weightage">Weightage %</FieldLabel>
          <Input id="assessment-weightage" type="number" min={0.01} max={100} step={0.01} value={form.weightage} onChange={set('weightage')} />
        </div>
      </div>
      <p className="text-xs text-[#9A9A9A]">Pass marks and weightage are optional. Weightage is stored for reference only.</p>

      {localError && <p className="text-sm text-red-600" role="alert">{localError}</p>}
      {mutation.isError && <FormError error={mutation.error} fallback={isEdit ? 'Unable to update assessment.' : 'Unable to create assessment.'} />}

      <Button type="submit" className="w-full" isLoading={mutation.isPending}>
        {isEdit ? 'Save Changes' : 'Create Assessment'}
      </Button>
    </form>
  );
}
