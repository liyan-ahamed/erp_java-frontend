'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { FieldLabel, FormError } from '@/components/gradebook/shared';
import { useAllSubjectOfferings, useCreateAssessment, useUpdateAssessment } from '@/hooks/useGradebook';
import { useBatches } from '@/hooks/useAcademic';
import { ASSESSMENT_TYPES, ASSESSMENT_TYPE_LABELS, SELECT_CLASS, offeringLabel } from '@/lib/gradebook-labels';
import { TeachingSelector } from '@/components/academic/TeachingSelector';
import { ClassRow, TeachingSelection, resolveSelection } from '@/lib/teaching-context';
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

const toForm = (a?: Assessment, copy = false): FormState => ({
  subjectOfferingId: a ? String(a.subjectOfferingId) : '',
  title: a ? (copy ? `${a.title} (copy)` : a.title) : '',
  assessmentType: a?.assessmentType ?? '',
  maxMarks: a ? String(Number(a.maxMarks)) : '',
  passMarks: a?.passMarks !== null && a?.passMarks !== undefined ? String(Number(a.passMarks)) : '',
  weightage: a?.weightage !== null && a?.weightage !== undefined ? String(Number(a.weightage)) : '',
  // A copy gets a fresh date: it is a new sitting of the assessment.
  assessmentDate: copy ? '' : a?.assessmentDate ?? '',
});

const isActive = (r: ClassRow) => r.active;

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

interface AssessmentFormProps {
  /** Edit this DRAFT assessment. */
  assessment?: Assessment;
  /** Create a new assessment pre-filled from this one (Duplicate). Marks are never copied. */
  template?: Assessment;
  /** Create mode: start with this class chosen (e.g. "Add to this class"). */
  initialOfferingId?: number;
  onSaved: (a: Assessment) => void;
}

/**
 * Create (STAFF, own active offerings only) or edit a DRAFT assessment. The class is picked as
 * Batch → Semester → Class. Weightage is stored as entered — nothing is calculated from it.
 */
export function AssessmentForm({ assessment, template, initialOfferingId, onSaved }: AssessmentFormProps) {
  const isEdit = !!assessment;
  const [form, setForm] = useState<FormState>(() => {
    const base = isEdit ? toForm(assessment) : toForm(template, true);
    return initialOfferingId ? { ...base, subjectOfferingId: String(initialOfferingId) } : base;
  });
  const [localError, setLocalError] = useState('');
  const offerings = useAllSubjectOfferings(!isEdit);
  const batches = useBatches(!isEdit);
  const create = useCreateAssessment();
  const update = useUpdateAssessment();
  const mutation = isEdit ? update : create;

  const allOfferings = useMemo(() => offerings.data ?? [], [offerings.data]);
  const activeOfferings = allOfferings.filter((o) => o.active);
  const chosen = allOfferings.find((o) => o.id === Number(form.subjectOfferingId));
  const [pick, setPick] = useState<TeachingSelection | null>(null);
  const selection = resolveSelection(
    pick ?? (chosen ? { batchId: chosen.batchId, semester: chosen.semester, offeringId: chosen.id } : { batchId: null, semester: null, offeringId: null }),
    allOfferings,
    batches.data,
  );
  // An inactive class (e.g. duplicating an old assessment) can't take new assessments.
  const offeringId = selection.offeringId !== null && activeOfferings.some((o) => o.id === selection.offeringId) ? selection.offeringId : null;

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
      if (offeringId === null) {
        setLocalError('Choose the class for this assessment.');
        return;
      }
      create.mutate({ ...payload, subjectOfferingId: offeringId }, { onSuccess: onSaved });
    }
  };

  if (!isEdit && offerings.isLoading) {
    return <div className="py-10 flex justify-center"><Spinner size="lg" /></div>;
  }
  if (!isEdit && offerings.isError) {
    return <FormError error={offerings.error} fallback="Unable to load your subject offerings." />;
  }
  if (!isEdit && activeOfferings.length === 0) {
    return <p className="text-sm text-muted">No active courses assigned to you.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {isEdit ? (
        <p className="text-xs text-muted">{offeringLabel(assessment)}</p>
      ) : (
        <TeachingSelector rows={allOfferings} batches={batches.data} value={{ ...selection, offeringId }} classMode="required"
          classFilter={isActive} stacked idPrefix="assessment" onChange={setPick} />
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
      <p className="text-xs text-muted">Pass marks and weightage are optional. Weightage is stored for reference only.</p>

      {localError && <p className="text-sm text-danger" role="alert">{localError}</p>}
      {mutation.isError && <FormError error={mutation.error} fallback={isEdit ? 'Unable to update assessment.' : 'Unable to create assessment.'} />}

      <Button type="submit" className="w-full" isLoading={mutation.isPending}>
        {isEdit ? 'Save Changes' : 'Create Assessment'}
      </Button>
    </form>
  );
}
