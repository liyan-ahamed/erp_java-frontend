import { BadgeProps } from '@/components/ui/Badge';
import {
  AssessmentStatus,
  AssessmentType,
  GradeStatusLabel,
  SubjectOffering,
  SubjectType,
} from '@/types/gradebook';

// Display-only labels for backend enum values. API calls always use the raw values.

export const SUBJECT_TYPES: SubjectType[] = ['THEORY', 'THEORY_CUM_PRACTICAL'];

export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  THEORY: 'Theory',
  THEORY_CUM_PRACTICAL: 'Theory + Practical',
};

export const ASSESSMENT_TYPES: AssessmentType[] = [
  'CAT_1', 'CAT_2', 'ASSIGNMENT', 'QUIZ', 'LAB', 'PRACTICAL', 'RECORD',
  'GROUP_PRESENTATION', 'SEMINAR', 'PROJECT', 'OTHER',
];

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  CAT_1: 'CAT 1',
  CAT_2: 'CAT 2',
  ASSIGNMENT: 'Assignment',
  QUIZ: 'Quiz',
  LAB: 'Lab',
  PRACTICAL: 'Practical',
  RECORD: 'Record',
  GROUP_PRESENTATION: 'Group Presentation',
  SEMINAR: 'Seminar',
  PROJECT: 'Project',
  OTHER: 'Other',
};

export const ASSESSMENT_STATUS_BADGE: Record<AssessmentStatus, { label: string; variant: BadgeProps['variant'] }> = {
  DRAFT: { label: 'Draft', variant: 'warning' },
  FINALIZED: { label: 'Finalized', variant: 'success' },
};

export const GRADE_STATUS_BADGE: Record<GradeStatusLabel, { label: string; variant: BadgeProps['variant'] }> = {
  GRADED: { label: 'Graded', variant: 'success' },
  ABSENT: { label: 'Absent', variant: 'error' },
  EXEMPTED: { label: 'Exempted', variant: 'info' },
  NOT_GRADED: { label: 'Not graded', variant: 'default' },
};

export const PENDING_CALCULATION_TEXT = 'Pending calculation configuration';

type ClassFields = Pick<SubjectOffering, 'batchName' | 'sectionName'>;

/** e.g. "Batch 2024-2028 · Section A" — built from backend names only. */
export const classLabel = (o: ClassFields) => `Batch ${o.batchName} · Section ${o.sectionName}`;

/** e.g. "Computer Networks — Batch 2024-2028 · Section A — Sem 1 — 2026-2027". */
export const offeringLabel = (o: ClassFields & Pick<SubjectOffering, 'subjectName' | 'semester' | 'academicYear'>) =>
  `${o.subjectName} — ${classLabel(o)} — Sem ${o.semester} — ${o.academicYear}`;

/** Marks without trailing zeros, e.g. 38 or 37.5. */
export const formatMarks = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : String(Number(value));

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

export const SELECT_CLASS =
  'h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:opacity-50 disabled:cursor-not-allowed';
