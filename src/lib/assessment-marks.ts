/**
 * Marks entry rules for the staff Assessments screens (contract §I / §J). Pure functions only, so they can be
 * tested without React. The backend re-validates every saved row and remains the authority.
 *
 * - A student's marks cell holds what the teacher typed. "AB" (any case) means absent.
 * - Marks are 0 … maxMarks with at most 2 decimals. Negative or larger values are errors, never clamped.
 * - Exempted students (set before this screen existed) stay exempted; they count as complete.
 * - Average / highest / lowest / pass rate use graded marks only. Absent and exempted students are left out,
 *   never counted as zero — the same rule as GET /assessments/{id}/summary.
 */

export interface MarkDraft {
  /** Exactly what is in the input ('' = nothing entered). Ignored when absent or exempted. */
  raw: string;
  absent: boolean;
  exempted: boolean;
}

export type MarkCheck =
  | { kind: 'empty' }
  | { kind: 'graded'; marks: number }
  | { kind: 'absent' }
  | { kind: 'exempted' }
  | { kind: 'error'; message: string };

const DECIMAL = /^\d+(\.\d{1,2})?$/;

/** Marks without trailing zeros, e.g. "25" or "17.5". */
export const formatMarkValue = (value: number) => String(Number(value.toFixed(2)));

export const isAbsentText = (raw: string) => raw.trim().toUpperCase() === 'AB';

export const checkMark = (draft: MarkDraft, maxMarks: number): MarkCheck => {
  if (draft.exempted) return { kind: 'exempted' };
  if (draft.absent || isAbsentText(draft.raw)) return { kind: 'absent' };
  const text = draft.raw.trim();
  if (text === '') return { kind: 'empty' };
  if (text.startsWith('-')) return { kind: 'error', message: "Marks can't be negative" };
  if (!/^\d*\.?\d*$/.test(text) || text === '.') return { kind: 'error', message: 'Enter a number or AB' };
  const value = Number(text);
  if (value > maxMarks) return { kind: 'error', message: `Max is ${formatMarkValue(maxMarks)}` };
  if (!DECIMAL.test(text.startsWith('.') ? `0${text}` : text.replace(/\.$/, ''))) return { kind: 'error', message: 'Use at most 2 decimals' };
  return { kind: 'graded', marks: value };
};

/** The value a draft would save as, for comparing with what is stored. null = nothing to save. */
export type SavedValue = { status: 'GRADED'; marks: number } | { status: 'ABSENT' } | { status: 'EXEMPTED' };

export const savedValueOf = (check: MarkCheck): SavedValue | null =>
  check.kind === 'graded' ? { status: 'GRADED', marks: check.marks }
    : check.kind === 'absent' ? { status: 'ABSENT' }
      : check.kind === 'exempted' ? { status: 'EXEMPTED' }
        : null;

export const sameSaved = (a: SavedValue | null, b: SavedValue | null) =>
  a === null || b === null ? a === b : a.status === b.status && (a.status !== 'GRADED' || a.marks === (b as { marks: number }).marks);

export interface MarkStats {
  total: number;
  /** Graded + absent + exempted (what "Marks entered" counts). */
  entered: number;
  notEntered: number;
  graded: number;
  absent: number;
  exempted: number;
  errors: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  /** Only with a pass mark. Share of graded students at or above it (0–100). */
  passCount: number | null;
  passRate: number | null;
}

export const computeStats = (checks: MarkCheck[], passMarks: number | null): MarkStats => {
  const marks: number[] = [];
  let absent = 0;
  let exempted = 0;
  let errors = 0;
  let empty = 0;
  for (const c of checks) {
    if (c.kind === 'graded') marks.push(c.marks);
    else if (c.kind === 'absent') absent++;
    else if (c.kind === 'exempted') exempted++;
    else if (c.kind === 'error') errors++;
    else empty++;
  }
  const passCount = passMarks === null ? null : marks.filter((m) => m >= passMarks).length;
  return {
    total: checks.length,
    entered: marks.length + absent + exempted,
    // A row with an invalid value has no usable mark yet.
    notEntered: empty + errors,
    graded: marks.length,
    absent,
    exempted,
    errors,
    average: marks.length ? marks.reduce((s, m) => s + m, 0) / marks.length : null,
    highest: marks.length ? Math.max(...marks) : null,
    lowest: marks.length ? Math.min(...marks) : null,
    passCount,
    passRate: passCount === null || marks.length === 0 ? null : (passCount * 100) / marks.length,
  };
};

/** Finalize is allowed only when every student is graded, absent or exempted and nothing is invalid. */
export const readyToFinalize = (stats: MarkStats) => stats.total > 0 && stats.notEntered === 0 && stats.errors === 0;

// ---------- Overview status (from GET /summary) ----------

export type ProgressState = 'not-started' | 'in-progress' | 'ready' | 'finalized';

export interface Progress {
  entered: number;
  total: number;
  missing: number;
  state: ProgressState;
}

/** Summary counts → progress. `entered = expected − notGraded` (absent and exempted count as entered). */
export const progressOf = (
  status: 'DRAFT' | 'FINALIZED',
  summary: { expectedStudentCount: number; notGradedCount: number },
): Progress => {
  const total = summary.expectedStudentCount;
  const missing = Math.max(0, summary.notGradedCount);
  const entered = Math.max(0, total - missing);
  const state: ProgressState =
    status === 'FINALIZED' ? 'finalized' : entered === 0 ? 'not-started' : missing > 0 ? 'in-progress' : 'ready';
  return { entered, total, missing, state };
};

export const ACTION_LABEL: Record<ProgressState, string> = {
  'not-started': 'Enter marks',
  'in-progress': 'Continue',
  ready: 'Review & finalize',
  finalized: 'View results',
};

// ---------- Import (.xlsx / .csv) ----------

export interface ImportStudent {
  studentId: number;
  registerNumber: string;
  name: string;
}

export type ImportKind = 'new' | 'overwrite' | 'unchanged' | 'invalid' | 'unmatched' | 'duplicate' | 'exempted';

export interface ImportItem {
  /** 1-based row number in the file. */
  line: number;
  registerNumber: string;
  rawMarks: string;
  kind: ImportKind;
  studentId?: number;
  name?: string;
  /** What the row would set (new / overwrite / unchanged). */
  value?: SavedValue;
  /** The value it would replace (overwrite). */
  current?: SavedValue;
  message?: string;
}

const REGISTER_HEADER = /reg|roll|enrol/i;
const MARKS_HEADER = /mark|score|total|result/i;

/** Finds the register-number and marks columns. A first row whose marks cell isn't a mark is a header. */
export const detectColumns = (table: string[][]): { reg: number; marks: number; headerRows: number } => {
  const first = table[0] ?? [];
  const reg = first.findIndex((c) => REGISTER_HEADER.test(c));
  const marks = first.findIndex((c, i) => i !== reg && MARKS_HEADER.test(c));
  if (reg >= 0 && marks >= 0) return { reg, marks, headerRows: 1 };
  const second = (first[1] ?? '').trim();
  const looksLikeData = second === '' || isAbsentText(second) || /^-?\d*\.?\d+$/.test(second);
  return { reg: 0, marks: 1, headerRows: looksLikeData ? 0 : 1 };
};

export const savedValueText = (v: SavedValue | null | undefined) =>
  !v ? '—' : v.status === 'GRADED' ? formatMarkValue(v.marks) : v.status === 'ABSENT' ? 'AB' : 'Exempted';

/**
 * Plans an import without changing anything. `current` is each student's value as it stands in the editor.
 * Overwrites are reported separately so they are never applied silently.
 */
export const buildImportPlan = (
  table: string[][],
  students: ImportStudent[],
  current: Map<number, SavedValue | null>,
  maxMarks: number,
): ImportItem[] => {
  const { reg, marks, headerRows } = detectColumns(table);
  const byRegister = new Map(students.map((s) => [s.registerNumber.trim().toUpperCase(), s]));
  const seen = new Map<string, number>();
  const items: ImportItem[] = [];

  table.forEach((cells, index) => {
    if (index < headerRows) return;
    const registerNumber = (cells[reg] ?? '').trim();
    const rawMarks = (cells[marks] ?? '').trim();
    if (!registerNumber && !rawMarks) return; // blank line
    const line = index + 1;
    const key = registerNumber.toUpperCase();
    const base = { line, registerNumber, rawMarks };

    if (seen.has(key)) {
      items.push({ ...base, kind: 'duplicate', message: `Also on row ${seen.get(key)}` });
      return;
    }
    seen.set(key, line);

    const student = byRegister.get(key);
    if (!student) {
      items.push({ ...base, kind: 'unmatched', message: registerNumber ? 'Not in this class' : 'No register number' });
      return;
    }
    const who = { studentId: student.studentId, name: student.name };
    const existing = current.get(student.studentId) ?? null;
    if (existing?.status === 'EXEMPTED') {
      items.push({ ...base, ...who, kind: 'exempted', current: existing, message: 'Exempted — left unchanged' });
      return;
    }
    const check = checkMark({ raw: rawMarks, absent: false, exempted: false }, maxMarks);
    if (check.kind === 'empty' || check.kind === 'error') {
      items.push({ ...base, ...who, kind: 'invalid', message: check.kind === 'empty' ? 'No marks given' : check.message });
      return;
    }
    const value = savedValueOf(check)!;
    if (existing === null) items.push({ ...base, ...who, kind: 'new', value });
    else if (sameSaved(existing, value)) items.push({ ...base, ...who, kind: 'unchanged', value, current: existing });
    else items.push({ ...base, ...who, kind: 'overwrite', value, current: existing });
  });
  return items;
};

/** CSV text for a finalized assessment's marks. */
export const marksCsv = (rows: { registerNumber: string; name: string; value: SavedValue | null }[]) => {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [['Register Number', 'Name', 'Marks', 'Status']].concat(
    rows.map((r) => [
      r.registerNumber,
      r.name,
      r.value?.status === 'GRADED' ? formatMarkValue(r.value.marks) : r.value?.status === 'ABSENT' ? 'AB' : '',
      r.value ? (r.value.status === 'GRADED' ? 'Graded' : r.value.status === 'ABSENT' ? 'Absent' : 'Exempted') : 'Not entered',
    ]),
  );
  return lines.map((l) => l.map(cell).join(',')).join('\r\n');
};
