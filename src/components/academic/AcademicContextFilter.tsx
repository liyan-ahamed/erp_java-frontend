'use client';

import { ReactNode, useMemo, useState } from 'react';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import {
  ALL_LEVELS,
  AcademicContext,
  AcademicLevel,
  AcademicRow,
  EMPTY_CONTEXT,
  cohortLabel,
  contextOf,
  resolveRow,
  sortCohorts,
} from '@/lib/academic-context';
import { Batch } from '@/types/academic';

interface AcademicContextFilterProps<T extends AcademicRow> {
  /** Backend records the options are derived from. Must be the complete list the user can see. */
  rows: T[];
  value: AcademicContext;
  onChange: (value: AcademicContext) => void;
  /** Which levels to show, always in the standard order. Default: all four. */
  levels?: readonly AcademicLevel[];
  /**
   * The backend's active cohorts (GET /batches). When given, exactly these are listed — even ones with no
   * rows yet. When omitted (e.g. students, who can't call /batches), cohorts come from `rows`.
   */
  cohorts?: Batch[];
  /** 'filter' offers "All …" choices; 'picker' asks the user to select each level. */
  mode?: 'filter' | 'picker';
  /** Prefix for element ids, so a page can render more than one filter. */
  idPrefix?: string;
  disabled?: boolean;
  /** Extra filters shown after the academic ones (e.g. Subject Type, Status). */
  children?: ReactNode;
  /** Render the selects as a vertical form (dialogs) instead of a wrapping toolbar row. */
  stacked?: boolean;
  /** Marks every level as required (form pickers). */
  required?: boolean;
}

type Option = { value: number; label: string };

const uniqueBy = <T,>(items: T[], key: (item: T) => number) => [...new Map(items.map((i) => [key(i), i])).values()];

/** Option lists for each level, each limited by the selections before it. */
export function useAcademicOptions<T extends AcademicRow>(rows: T[], value: AcademicContext, cohorts?: Batch[]) {
  return useMemo(() => {
    const cohortOptions: Option[] = cohorts
      ? sortCohorts(cohorts).map((b) => ({ value: b.id, label: cohortLabel(b) }))
      : uniqueBy(rows, (r) => r.batchId)
          .sort((a, b) => b.batchName.localeCompare(a.batchName))
          .map((r) => ({ value: r.batchId, label: r.batchName }));

    const inCohort = rows.filter((r) => value.batchId === null || r.batchId === value.batchId);
    const semesterOptions: Option[] = [...new Set(inCohort.map((r) => r.semester))]
      .sort((a, b) => a - b)
      .map((s) => ({ value: s, label: `Semester ${s}` }));

    const inSemester = inCohort.filter((r) => value.semester === null || r.semester === value.semester);
    const sectionOptions: Option[] = uniqueBy(inSemester, (r) => r.sectionId)
      .sort((a, b) => a.sectionName.localeCompare(b.sectionName))
      .map((r) => ({ value: r.sectionId, label: `Section ${r.sectionName}` }));

    const inSection = inSemester.filter((r) => value.sectionId === null || r.sectionId === value.sectionId);
    const subjectOptions: Option[] = uniqueBy(inSection, (r) => r.subjectId)
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
      .map((r) => ({ value: r.subjectId, label: `${r.subjectName} (${r.subjectCode})` }));

    return { cohort: cohortOptions, semester: semesterOptions, section: sectionOptions, subject: subjectOptions };
  }, [rows, value, cohorts]);
}

/** Drops any selection that is no longer valid for the selections before it. */
const normalize = <T extends AcademicRow>(rows: T[], next: AcademicContext, cohorts?: Batch[]): AcademicContext => {
  const valid = (list: Option[], v: number | null) => (v !== null && list.some((o) => o.value === v) ? v : null);
  // Resolve level by level, so a cleared level also clears the ones below it.
  const steps: AcademicContext = { batchId: null, semester: null, sectionId: null, subjectId: null };
  const cohortList = cohorts ? cohorts.map((b) => ({ value: b.id, label: '' })) : uniqueBy(rows, (r) => r.batchId).map((r) => ({ value: r.batchId, label: '' }));
  steps.batchId = valid(cohortList, next.batchId);
  if (steps.batchId === null) return steps;
  const inCohort = rows.filter((r) => r.batchId === steps.batchId);
  steps.semester = valid([...new Set(inCohort.map((r) => r.semester))].map((s) => ({ value: s, label: '' })), next.semester);
  if (steps.semester === null) return steps;
  const inSemester = inCohort.filter((r) => r.semester === steps.semester);
  steps.sectionId = valid(inSemester.map((r) => ({ value: r.sectionId, label: '' })), next.sectionId);
  const inSection = inSemester.filter((r) => steps.sectionId === null || r.sectionId === steps.sectionId);
  steps.subjectId = valid(inSection.map((r) => ({ value: r.subjectId, label: '' })), next.subjectId);
  return steps;
};

const LEVEL_KEY: Record<AcademicLevel, keyof AcademicContext> = {
  cohort: 'batchId',
  semester: 'semester',
  section: 'sectionId',
  subject: 'subjectId',
};
const LEVEL_NAME: Record<AcademicLevel, string> = { cohort: 'Cohort', semester: 'Semester', section: 'Section', subject: 'Subject' };
// Cohort is never "all": department views start with no cohort and show nothing until one is chosen.
const ALL_TEXT: Record<AcademicLevel, string> = { cohort: 'Select cohort', semester: 'All semesters', section: 'All sections', subject: 'All subjects' };

/**
 * Standard academic filter: Cohort → Semester → Section → Subject, each step offering only what is valid
 * for the steps before it. Semester needs a cohort; Section and Subject need a semester.
 */
export function AcademicContextFilter<T extends AcademicRow>({
  rows,
  value,
  onChange,
  levels = ALL_LEVELS,
  cohorts,
  mode = 'filter',
  idPrefix = 'academic',
  disabled,
  children,
  stacked,
  required,
}: AcademicContextFilterProps<T>) {
  const options = useAcademicOptions(rows, value, cohorts);
  const shown = ALL_LEVELS.filter((l) => levels.includes(l));

  const needs = (level: AcademicLevel): string | null => {
    if (level === 'semester' && shown.includes('cohort') && value.batchId === null) return 'Select a cohort first';
    if ((level === 'section' || level === 'subject') && shown.includes('semester') && value.semester === null) return 'Select a semester first';
    return null;
  };

  // Changing a level always clears every level after it (Cohort → Semester → Section → Subject), so no
  // stale choice from another class survives.
  const set = (level: AcademicLevel, raw: string) => {
    const next: AcademicContext = { ...value, [LEVEL_KEY[level]]: raw ? Number(raw) : null };
    ALL_LEVELS.slice(ALL_LEVELS.indexOf(level) + 1).forEach((after) => { next[LEVEL_KEY[after]] = null; });
    onChange(normalize(rows, next, cohorts));
  };

  const selects = shown.map((level) => {
    const blocked = needs(level);
    const list = options[level];
    const current = value[LEVEL_KEY[level]];
    const placeholder = blocked ?? (list.length === 0 ? `No ${LEVEL_NAME[level].toLowerCase()}s available` : mode === 'filter' ? ALL_TEXT[level] : `Select ${LEVEL_NAME[level].toLowerCase()}`);
    const select = (
      <select
        id={`${idPrefix}-${level}`}
        aria-label={stacked ? undefined : LEVEL_NAME[level]}
        className={`${SELECT_CLASS} ${stacked ? 'w-full' : 'max-sm:w-full'}`}
        value={current ?? ''}
        disabled={disabled || !!blocked || list.length === 0}
        required={required}
        onChange={(e) => set(level, e.target.value)}
      >
        <option value="">{placeholder}</option>
        {list.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
    return stacked ? (
      <div key={level} className="space-y-1.5">
        <label htmlFor={`${idPrefix}-${level}`} className="f-label">{LEVEL_NAME[level]}{required ? ' *' : ''}</label>
        {select}
      </div>
    ) : (
      <div key={level} className="min-w-0">{select}</div>
    );
  });

  if (stacked) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {selects}
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3" role="group" aria-label="Academic filters">
      {selects}
      {children}
    </div>
  );
}

type PickableRow = AcademicRow & { id: number; active?: boolean; academicYear?: string };

interface OfferingPickerProps<T extends PickableRow> {
  rows: T[];
  /** Currently chosen record id (e.g. a subject offering), or null. */
  value: number | null;
  /** Called with the record once all four levels are chosen, or null while incomplete. */
  onChange: (row: T | null) => void;
  /** Levels already known when nothing is chosen yet (e.g. the class the user is looking at). */
  initialContext?: AcademicContext;
  cohorts?: Batch[];
  idPrefix?: string;
  stacked?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

/**
 * Picks one class course (subject offering) through Cohort → Semester → Section → Subject,
 * replacing the old single dropdown of long combined labels.
 */
export function OfferingPicker<T extends PickableRow>({ rows, value, onChange, initialContext, cohorts, idPrefix, stacked, disabled, children }: OfferingPickerProps<T>) {
  const selected = rows.find((r) => r.id === value) ?? null;
  // Local while the user is part-way through; otherwise follow the chosen record (e.g. from the URL).
  const [draft, setDraft] = useState<AcademicContext | null>(null);
  const ctx = draft ?? (selected ? contextOf(selected) : initialContext ?? EMPTY_CONTEXT);

  return (
    <AcademicContextFilter
      rows={rows}
      value={ctx}
      cohorts={cohorts}
      mode="picker"
      idPrefix={idPrefix}
      stacked={stacked}
      disabled={disabled}
      required={stacked}
      onChange={(next) => {
        setDraft(next);
        onChange(resolveRow(rows, next));
      }}
    >
      {children}
    </AcademicContextFilter>
  );
}
