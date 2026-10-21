import { Batch } from '@/types/academic';

/**
 * The standard academic hierarchy used by every academic filter: Cohort → Semester → Section → Subject.
 * Rows are backend records that carry these fields (subject offerings, enrollments, timetable slots…).
 * Options are always derived from backend data — nothing here is a hardcoded year or curriculum.
 */
export interface AcademicRow {
  batchId: number;
  batchName: string;
  semester: number;
  sectionId: number;
  sectionName: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
}

export interface AcademicContext {
  batchId: number | null;
  semester: number | null;
  sectionId: number | null;
  subjectId: number | null;
}

export type AcademicLevel = 'cohort' | 'semester' | 'section' | 'subject';
export const ALL_LEVELS: readonly AcademicLevel[] = ['cohort', 'semester', 'section', 'subject'];

export const EMPTY_CONTEXT: AcademicContext = { batchId: null, semester: null, sectionId: null, subjectId: null };

export const contextOf = (row: AcademicRow): AcademicContext => ({
  batchId: row.batchId,
  semester: row.semester,
  sectionId: row.sectionId,
  subjectId: row.subjectId,
});

/** True when the row agrees with every level that is set. Unset levels match everything. */
export const matchesContext = (row: AcademicRow, ctx: AcademicContext) =>
  (ctx.batchId === null || row.batchId === ctx.batchId) &&
  (ctx.semester === null || row.semester === ctx.semester) &&
  (ctx.sectionId === null || row.sectionId === ctx.sectionId) &&
  (ctx.subjectId === null || row.subjectId === ctx.subjectId);

export const isComplete = (ctx: AcademicContext) =>
  ctx.batchId !== null && ctx.semester !== null && ctx.sectionId !== null && ctx.subjectId !== null;

/**
 * The single record for a fully chosen context. If the backend has more than one (e.g. the same class
 * in two academic years), prefer an active one, then the latest academic year.
 */
export const resolveRow = <T extends AcademicRow & { active?: boolean; academicYear?: string }>(rows: T[], ctx: AcademicContext): T | null => {
  if (!isComplete(ctx)) return null;
  const matches = rows.filter((r) => matchesContext(r, ctx));
  return (
    [...matches].sort(
      (a, b) => Number(b.active ?? true) - Number(a.active ?? true) || (b.academicYear ?? '').localeCompare(a.academicYear ?? ''),
    )[0] ?? null
  );
};

const YEAR_NAMES: Record<number, string> = { 1: '1st year', 2: '2nd year', 3: '3rd year', 4: '4th year' };

/** e.g. "2024-2028 · 3rd year". Built from backend values only. */
export const cohortLabel = (b: Pick<Batch, 'name' | 'currentYear'>) =>
  b.currentYear ? `${b.name} · ${YEAR_NAMES[b.currentYear] ?? `Year ${b.currentYear}`}` : b.name;

/** Newest cohort first (by admission year, then name). */
export const sortCohorts = <T extends Pick<Batch, 'name' | 'admissionYear'>>(list: T[]) =>
  [...list].sort((a, b) => (b.admissionYear ?? 0) - (a.admissionYear ?? 0) || b.name.localeCompare(a.name));

/** Compact class name for tables and cards, e.g. "2024-2028 · Sec A". */
export const classShortLabel = (r: Pick<AcademicRow, 'batchName' | 'sectionName'>) => `${r.batchName} · Sec ${r.sectionName}`;
