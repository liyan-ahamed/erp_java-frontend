'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { FieldLabel, FormError } from '@/components/gradebook/shared';
import { useBatches, useSections } from '@/hooks/useAcademic';
import { useAllSubjects, useAssessments, useSaveSubjectOffering, useStaffOptions } from '@/hooks/useGradebook';
import { getApiErrorMessage } from '@/lib/api-error';
import { isGradebookEnabled } from '@/lib/feature-flags';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import { AcademicContext, cohortLabel, sortCohorts } from '@/lib/academic-context';
import { SubjectOffering, SubjectOfferingRequest } from '@/types/gradebook';
import { Batch } from '@/types/academic';

// The backend accepts semesters 1–8 for an offering (SubjectOfferingRequest @Min(1) @Max(8)).
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

interface CourseAssignFormProps {
  /** Existing class course to edit; omit to assign a new one. */
  offering?: SubjectOffering;
  /** Pre-fills a new assignment from the page's current filters. */
  initial?: AcademicContext;
  /** Every class course the HOD can see — only used to suggest the academic year already in use. */
  existing: SubjectOffering[];
  onSaved: (o: SubjectOffering) => void;
}

/**
 * Assign a subject to a class (creates or edits a subject offering):
 * Cohort → Semester → Section → Subject → Faculty, plus the academic year the backend requires.
 */
export function CourseAssignForm({ offering, initial, existing, onSaved }: CourseAssignFormProps) {
  const subjects = useAllSubjects();
  const staff = useStaffOptions();
  const batches = useBatches();
  // Subject, class, year and semester are fixed by the backend once assessments exist. While
  // marking is switched off /assessments is unavailable, so the backend's own error covers it.
  const existingAssessments = useAssessments({ page: 0, size: 1, subjectOfferingId: offering?.id }, !!offering && isGradebookEnabled());
  const contextLocked = !!offering && (existingAssessments.data?.totalElements ?? 0) > 0;
  const save = useSaveSubjectOffering();

  const [form, setForm] = useState({
    batchId: offering ? String(offering.batchId) : initial?.batchId ? String(initial.batchId) : '',
    semester: offering ? String(offering.semester) : initial?.semester ? String(initial.semester) : '',
    sectionId: offering ? String(offering.sectionId) : initial?.sectionId ? String(initial.sectionId) : '',
    subjectId: offering ? String(offering.subjectId) : initial?.subjectId ? String(initial.subjectId) : '',
    staffId: offering ? String(offering.staffId) : '',
    academicYear: offering?.academicYear ?? '',
    active: offering?.active ?? true,
  });
  const sections = useSections(form.batchId ? Number(form.batchId) : null, !!form.batchId);

  // /batches and /sections list active batches only. When editing, keep the
  // course's own batch/section selectable even if its batch was retired.
  const batchOptions: Batch[] = sortCohorts(batches.data ?? []);
  if (offering && !batchOptions.some((b) => b.id === offering.batchId)) {
    batchOptions.push({ id: offering.batchId, name: offering.batchName, currentYear: null, admissionYear: null, graduationYear: null, active: false });
  }
  const sectionOptions = (sections.data ?? []).map((sec) => ({ id: sec.id, name: sec.name }));
  if (offering && String(offering.batchId) === form.batchId && !sectionOptions.some((sec) => sec.id === offering.sectionId)) {
    sectionOptions.push({ id: offering.sectionId, name: offering.sectionName });
  }

  // Academic years already used by this cohort + semester in backend data (a suggestion only).
  const usedYears = [...new Set(
    existing
      .filter((o) => String(o.batchId) === form.batchId && String(o.semester) === form.semester)
      .map((o) => o.academicYear),
  )].sort().reverse();

  const set = (patch: Partial<typeof form>) => setForm((old) => ({ ...old, ...patch }));
  const onBatchChange = (batchId: string) =>
    // Sections belong to one batch, so a new batch always needs a new section.
    set({ batchId, sectionId: batchId === form.batchId ? form.sectionId : '' });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: SubjectOfferingRequest = {
      subjectId: Number(form.subjectId),
      batchId: Number(form.batchId),
      sectionId: Number(form.sectionId),
      staffId: Number(form.staffId),
      academicYear: form.academicYear.trim(),
      semester: Number(form.semester),
      active: form.active,
    };
    save.mutate({ id: offering?.id, payload }, { onSuccess: onSaved });
  };

  if (subjects.isLoading || staff.isLoading || batches.isLoading) {
    return <div className="py-10 flex justify-center"><Spinner size="lg" /></div>;
  }
  const loadError = subjects.error ?? staff.error ?? batches.error;
  if (loadError) return <FormError error={loadError} fallback="Unable to load form options." />;

  return (
    <form onSubmit={submit} className="space-y-4">
      {contextLocked && (
        <p className="rounded-[10px] bg-warn-soft border border-warn/30 p-3 text-xs text-warn">
          This course has assessments, so its cohort, semester, section, subject and academic year are locked.
          Faculty and status can still change.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="assign-cohort">Cohort *</FieldLabel>
          <select id="assign-cohort" required disabled={contextLocked} value={form.batchId}
            onChange={(e) => onBatchChange(e.target.value)} className={`${SELECT_CLASS} w-full`}>
            <option value="">Select cohort</option>
            {batchOptions.map((b) => (
              <option key={b.id} value={b.id}>{cohortLabel(b)}{b.active ? '' : ' (inactive)'}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="assign-semester">Semester *</FieldLabel>
          <select id="assign-semester" required disabled={contextLocked} value={form.semester}
            onChange={(e) => set({ semester: e.target.value })} className={`${SELECT_CLASS} w-full`}>
            <option value="">Select semester</option>
            {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="assign-section">Section *</FieldLabel>
          <select id="assign-section" required disabled={contextLocked || !form.batchId || sections.isLoading}
            value={form.sectionId} onChange={(e) => set({ sectionId: e.target.value })} className={`${SELECT_CLASS} w-full`}>
            <option value="">
              {!form.batchId ? 'Select a cohort first' : sections.isLoading ? 'Loading sections...' : 'Select section'}
            </option>
            {sectionOptions.map((sec) => <option key={sec.id} value={sec.id}>Section {sec.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="assign-subject">Subject *</FieldLabel>
          <select id="assign-subject" required disabled={contextLocked} value={form.subjectId}
            onChange={(e) => set({ subjectId: e.target.value })} className={`${SELECT_CLASS} w-full`}>
            <option value="">Select subject</option>
            {subjects.data?.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code}){s.active ? '' : ' (inactive)'}</option>
            ))}
          </select>
        </div>
      </div>
      {form.batchId && sections.isError && (
        <p className="text-xs text-danger">{getApiErrorMessage(sections.error, 'Unable to load sections.')}</p>
      )}
      {form.batchId && sections.isSuccess && sectionOptions.length === 0 && (
        <p className="text-xs text-muted">No sections available for this cohort.</p>
      )}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="assign-staff">Faculty *</FieldLabel>
        <select id="assign-staff" required value={form.staffId}
          onChange={(e) => set({ staffId: e.target.value })} className={`${SELECT_CLASS} w-full`}>
          <option value="">Select faculty member</option>
          {staff.data?.map((u) => (
            <option key={u.id} value={u.id}>{u.name} — {u.designation || 'Staff'}</option>
          ))}
          {offering && !staff.data?.some((u) => u.id === offering.staffId) && (
            <option value={offering.staffId}>{offering.staffName} (not an active staff member)</option>
          )}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="assign-year">Academic Year *</FieldLabel>
          <Input
            id="assign-year"
            required
            disabled={contextLocked}
            pattern="\d{4}-\d{4}"
            title="Two consecutive years, e.g. 2026-2027"
            placeholder="e.g. 2026-2027"
            value={form.academicYear}
            onChange={(e) => set({ academicYear: e.target.value })}
          />
          {!contextLocked && usedYears.length > 0 && usedYears[0] !== form.academicYear && (
            <button type="button" className="text-[11px] text-accent hover:underline" onClick={() => set({ academicYear: usedYears[0] })}>
              Use {usedYears[0]} (already used for this semester)
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm sm:mt-7">
          <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
          Active
        </label>
      </div>

      {save.isError && <FormError error={save.error} fallback="Unable to save this course assignment." />}

      <Button type="submit" className="w-full" isLoading={save.isPending}>
        {offering ? 'Save Changes' : 'Assign Course'}
      </Button>
    </form>
  );
}
