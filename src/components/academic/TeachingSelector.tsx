'use client';

import { ReactNode, useMemo } from 'react';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import {
  BatchInfo,
  ClassRow,
  TeachingSelection,
  batchOptions,
  classOptions,
  classesIn,
  semesterOptions,
} from '@/lib/teaching-context';

interface TeachingSelectorProps {
  /** The staff member's own offerings (GET /subject-offerings). */
  rows: ClassRow[];
  batches?: BatchInfo[];
  /** Always a resolved selection (see useTeachingSelection / resolveSelection). */
  value: TeachingSelection;
  onChange: (next: TeachingSelection) => void;
  /**
   * 'all': offers "All my classes (N)" (overview pages). 'required': one class must be picked (forms, single-class
   * pages). 'none': Batch and Semester only.
   */
  classMode?: 'all' | 'required' | 'none';
  /** Only offer classes that pass this test (e.g. active offerings in a create form). */
  classFilter?: (row: ClassRow) => boolean;
  idPrefix?: string;
  disabled?: boolean;
  /** Labelled fields in a grid (dialogs) instead of a toolbar row. */
  stacked?: boolean;
  children?: ReactNode;
}

/** Batch → Semester → Class for STAFF pages. Changing a level clears the levels after it. */
export function TeachingSelector({
  rows,
  batches,
  value,
  onChange,
  classMode = 'all',
  classFilter,
  idPrefix = 'teaching',
  disabled,
  stacked,
  children,
}: TeachingSelectorProps) {
  const batchList = useMemo(() => batchOptions(rows, batches), [rows, batches]);
  const semesterList = useMemo(() => semesterOptions(value.batchId, rows, batches), [value.batchId, rows, batches]);
  const classRows = useMemo(
    () => classesIn(rows, value).filter((r) => !classFilter || classFilter(r)),
    [rows, value, classFilter],
  );
  const classList = useMemo(() => classOptions(classRows), [classRows]);

  const field = (key: string, label: string, control: ReactNode) =>
    stacked ? (
      <div key={key} className="space-y-1.5">
        <label htmlFor={`${idPrefix}-${key}`} className="f-label">{label}</label>
        {control}
      </div>
    ) : (
      <div key={key} className="min-w-0">{control}</div>
    );

  const selectClass = `${SELECT_CLASS} ${stacked ? 'w-full' : 'max-sm:w-full'}`;

  const fields = [
    field(
      'batch',
      'Batch',
      <select
        id={`${idPrefix}-batch`}
        aria-label={stacked ? undefined : 'Batch'}
        className={selectClass}
        value={value.batchId ?? ''}
        disabled={disabled || batchList.length === 0}
        onChange={(e) => onChange({ batchId: Number(e.target.value) || null, semester: null, offeringId: null })}
      >
        {batchList.length === 0 && <option value="">No batches assigned</option>}
        {batchList.map((b) => <option key={b.batchId} value={b.batchId}>{b.label}</option>)}
      </select>,
    ),
    field(
      'semester',
      'Semester',
      <select
        id={`${idPrefix}-semester`}
        aria-label={stacked ? undefined : 'Semester'}
        className={selectClass}
        value={value.semester ?? ''}
        disabled={disabled || semesterList.length === 0}
        onChange={(e) => onChange({ ...value, semester: Number(e.target.value) || null, offeringId: null })}
      >
        {semesterList.length === 0 && <option value="">Select a batch first</option>}
        {semesterList.map((s) => <option key={s.semester} value={s.semester}>{s.label}</option>)}
      </select>,
    ),
  ];

  if (classMode !== 'none') {
    fields.push(
      field(
        'class',
        'Class',
        <select
          id={`${idPrefix}-class`}
          aria-label={stacked ? undefined : 'Class'}
          className={selectClass}
          value={value.offeringId ?? ''}
          disabled={disabled || (classMode === 'required' && classList.length === 0)}
          required={classMode === 'required'}
          onChange={(e) => onChange({ ...value, offeringId: Number(e.target.value) || null })}
        >
          {classMode === 'all' ? (
            <option value="">All my classes ({classList.length})</option>
          ) : (
            <option value="">{classList.length === 0 ? 'No classes in this semester' : 'Select a class'}</option>
          )}
          {classList.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>,
      ),
    );
  }

  if (stacked) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {fields}
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3" role="group" aria-label="Batch, semester and class">
      {fields}
      {children}
    </div>
  );
}
