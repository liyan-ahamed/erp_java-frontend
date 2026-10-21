import { Batch } from '@/types/academic';
import { SubjectOffering } from '@/types/gradebook';

/**
 * Staff academic selection: Batch → Semester → Class (contract §G).
 *
 * - "Batch" is the display word for the backend's batch (`batchId` / `batchName` are unchanged).
 * - A class is one subject offering — a subject taught to one section of one batch in one semester —
 *   identified by its offering id, never by a label.
 * - Every option comes from the signed-in staff member's own offerings (`GET /subject-offerings` is
 *   staff-scoped), so batches and classes are always their own teaching assignments, including past ones.
 * - The current semester comes from the backend (`Batch.currentSemester`, §G1). Until the backend sends it,
 *   the latest semester the batch has reached that has classes is used and labelled "Latest", not "Current".
 *   Today's date is never used.
 */

export interface TeachingSelection {
  batchId: number | null;
  semester: number | null;
  /** null = all my classes (overview pages) or not chosen yet (pickers). */
  offeringId: number | null;
}

export const EMPTY_SELECTION: TeachingSelection = { batchId: null, semester: null, offeringId: null };

export type ClassRow = Pick<
  SubjectOffering,
  'id' | 'subjectId' | 'subjectCode' | 'subjectName' | 'batchId' | 'batchName' | 'sectionId' | 'sectionName' | 'semester' | 'academicYear' | 'active'
> & { subjectAcronym?: string | null; studentCount?: number | null };

/** Batch metadata the selector understands. `currentSemester` is optional until the backend ships §G1. */
export type BatchInfo = Pick<Batch, 'id' | 'name' | 'admissionYear' | 'currentYear'> & { currentSemester?: number | null };

export type SemesterTag = 'current' | 'latest' | 'previous' | 'upcoming' | null;

export interface SemesterOption {
  semester: number;
  tag: SemesterTag;
  label: string;
}

export interface BatchOption {
  batchId: number;
  label: string;
}

const SMALL_WORDS = new Set(['and', 'of', 'the', 'in', 'for', 'to', 'using', 'with', 'a', 'an', 'on', '&']);

/** Backend acronym when sent; otherwise initials of the subject name (display only), e.g. "OOPJ". */
export const subjectAcronym = (row: Pick<ClassRow, 'subjectName' | 'subjectCode'> & { subjectAcronym?: string | null }) => {
  if (row.subjectAcronym?.trim()) return row.subjectAcronym.trim();
  const words = row.subjectName.split(/[\s/-]+/).filter((w) => w && !SMALL_WORDS.has(w.toLowerCase()));
  // A one-word name ("NPTEL", "Leetcode") is shown as written.
  if (words.length <= 1) return row.subjectName.trim() || row.subjectCode;
  return words.map((w) => (/^[IVX]+$/.test(w) ? w : w[0].toUpperCase())).join('');
};

/** "2025-2029" → "2025–2029 Batch". */
export const batchLabel = (batchName: string) => `${batchName.replace(/-/g, '–')} Batch`;

/** "CN · Sec A" — with the batch added when needed to tell two classes apart. */
export const classOptionLabel = (row: ClassRow, withBatch = false) =>
  `${subjectAcronym(row)} · Sec ${row.sectionName}${withBatch ? ` · ${row.batchName.replace(/-/g, '–')}` : ''}`;

const uniqueBy = <T,>(items: T[], key: (item: T) => number) => [...new Map(items.map((i) => [key(i), i])).values()];

/** Batches the staff member teaches (or has taught), newest first. */
export const batchOptions = (rows: ClassRow[], batches: BatchInfo[] | undefined): BatchOption[] =>
  uniqueBy(rows, (r) => r.batchId)
    .map((r) => ({ row: r, info: batches?.find((b) => b.id === r.batchId) }))
    .sort((a, b) => (b.info?.admissionYear ?? 0) - (a.info?.admissionYear ?? 0) || b.row.batchName.localeCompare(a.row.batchName))
    .map(({ row }) => ({ batchId: row.batchId, label: batchLabel(row.batchName) }));

/**
 * The batch's current semester. `currentSemester` from the backend wins. Fallback: the latest semester with
 * one of my classes that the batch has reached (≤ currentYear × 2), tagged 'latest'.
 */
export const currentSemesterOf = (
  batchId: number,
  rows: ClassRow[],
  batches: BatchInfo[] | undefined,
): { semester: number; tag: 'current' | 'latest' } | null => {
  const info = batches?.find((b) => b.id === batchId);
  if (info?.currentSemester) return { semester: info.currentSemester, tag: 'current' };
  const reachable = info?.currentYear ? info.currentYear * 2 : Infinity;
  const mine = rows.filter((r) => r.batchId === batchId).map((r) => r.semester);
  const reached = mine.filter((s) => s <= reachable);
  const pick = reached.length > 0 ? Math.max(...reached) : mine.length > 0 ? Math.min(...mine) : null;
  return pick === null ? null : { semester: pick, tag: 'latest' };
};

const TAG_TEXT: Record<Exclude<SemesterTag, null>, string> = {
  current: 'Current',
  latest: 'Latest',
  previous: 'Previous',
  upcoming: 'Upcoming',
};

/**
 * Semesters for the chosen batch: the current one first, then previous ones (newest first), then any later
 * semester in which I already have a class (planning set up by the HOD), tagged "Upcoming".
 * Semesters with none of my classes are only listed when they are the current one.
 */
export const semesterOptions = (batchId: number | null, rows: ClassRow[], batches: BatchInfo[] | undefined): SemesterOption[] => {
  if (batchId === null) return [];
  const current = currentSemesterOf(batchId, rows, batches);
  const set = new Set(rows.filter((r) => r.batchId === batchId).map((r) => r.semester));
  if (current) set.add(current.semester);
  const list = [...set].map((semester): SemesterOption => {
    let tag: SemesterTag = null;
    if (current) {
      if (semester === current.semester) tag = current.tag;
      else if (semester < current.semester) tag = current.tag === 'current' ? 'previous' : null;
      else tag = 'upcoming';
    }
    return { semester, tag, label: tag ? `${TAG_TEXT[tag]} — Semester ${semester}` : `Semester ${semester}` };
  });
  const rank = (o: SemesterOption) => (o.tag === 'current' || o.tag === 'latest' ? 0 : o.tag === 'upcoming' ? 2 : 1);
  return list.sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? a.semester - b.semester : b.semester - a.semester));
};

/** My classes in the chosen batch + semester, by subject then section. */
export const classesIn = <T extends ClassRow>(rows: T[], sel: Pick<TeachingSelection, 'batchId' | 'semester'>): T[] =>
  rows
    .filter((r) => (sel.batchId === null || r.batchId === sel.batchId) && (sel.semester === null || r.semester === sel.semester))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName) || a.sectionName.localeCompare(b.sectionName) || Number(b.active) - Number(a.active));

/** Class options; labels gain the batch (then the academic year) only when two would otherwise read the same. */
export const classOptions = (rows: ClassRow[]): { value: number; label: string }[] => {
  const base = rows.map((r) => ({ r, label: classOptionLabel(r) }));
  return base.map(({ r, label }) => {
    const twins = base.filter((x) => x.label === label);
    if (twins.length <= 1) return { value: r.id, label };
    const withBatch = classOptionLabel(r, true);
    const stillTwins = twins.filter((x) => classOptionLabel(x.r, true) === withBatch).length > 1;
    return { value: r.id, label: stillTwins ? `${withBatch} · ${r.academicYear}${r.active ? '' : ' (inactive)'}` : withBatch };
  });
};

/**
 * Default batch: the one where I teach the most classes in its current semester. `prefer` (offering ids with
 * data the page cares about, e.g. draft assessments) wins first, so overview pages don't open empty.
 */
export const defaultBatch = (rows: ClassRow[], batches: BatchInfo[] | undefined, prefer?: number[]): number | null => {
  const options = batchOptions(rows, batches);
  if (options.length === 0) return null;
  const score = (batchId: number) => {
    const current = currentSemesterOf(batchId, rows, batches);
    const inCurrent = rows.filter((r) => r.batchId === batchId && r.semester === current?.semester);
    const preferred = prefer ? inCurrent.filter((r) => prefer.includes(r.id)).length : 0;
    return [preferred, inCurrent.filter((r) => r.active).length];
  };
  return [...options]
    .map((o, index) => ({ o, index, s: score(o.batchId) }))
    .sort((a, b) => b.s[0] - a.s[0] || b.s[1] - a.s[1] || a.index - b.index)[0].o.batchId;
};

/**
 * Keeps a selection valid: an unknown batch falls back to the default, a semester the batch doesn't offer
 * falls back to its current one, and a class outside the batch + semester is cleared.
 */
export const resolveSelection = (
  wanted: TeachingSelection,
  rows: ClassRow[],
  batches: BatchInfo[] | undefined,
  prefer?: number[],
): TeachingSelection => {
  // A link that names only the class (e.g. ?class=12) opens on that class's batch and semester.
  const linked = wanted.offeringId !== null ? rows.find((r) => r.id === wanted.offeringId) : undefined;
  if (linked && (wanted.batchId === null || wanted.semester === null)) {
    wanted = { batchId: linked.batchId, semester: linked.semester, offeringId: linked.id };
  }
  const batchList = batchOptions(rows, batches);
  const batchId = batchList.some((b) => b.batchId === wanted.batchId) ? wanted.batchId : defaultBatch(rows, batches, prefer);
  if (batchId === null) return EMPTY_SELECTION;
  const semesters = semesterOptions(batchId, rows, batches);
  const semester = semesters.some((s) => s.semester === wanted.semester)
    ? wanted.semester
    : currentSemesterOf(batchId, rows, batches)?.semester ?? semesters[0]?.semester ?? null;
  const offeringId = classesIn(rows, { batchId, semester }).some((r) => r.id === wanted.offeringId) ? wanted.offeringId : null;
  return { batchId, semester, offeringId };
};

/** Selection ↔ URL query (`batch`, `sem`, `class`). */
export const selectionFromParams = (params: URLSearchParams): TeachingSelection => {
  const num = (key: string) => {
    const n = Number(params.get(key));
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  // `offering` is the older single-class parameter (e.g. links from Courses to Internal Marks).
  return { batchId: num('batch'), semester: num('sem'), offeringId: num('class') ?? num('offering') };
};

export const selectionToParams = (sel: TeachingSelection, base?: URLSearchParams) => {
  const params = new URLSearchParams(base);
  const put = (key: string, value: number | null) => (value === null ? params.delete(key) : params.set(key, String(value)));
  put('batch', sel.batchId);
  put('sem', sel.semester);
  put('class', sel.offeringId);
  return params;
};
