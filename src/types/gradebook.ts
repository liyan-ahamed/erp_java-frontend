// Gradebook + Internal Assessment API shapes. Item fields are camelCase (the
// shared page wrapper is still snake_case — see lib/pagination.ts). Enum values
// match the backend exactly; readable labels live in lib/gradebook-labels.ts.
// Decimal values (marks etc.) arrive as JSON numbers. Dates are "YYYY-MM-DD";
// timestamps are server-local without an offset.

export type SubjectType = 'THEORY' | 'THEORY_CUM_PRACTICAL';

export type AssessmentType =
  | 'CAT_1'
  | 'CAT_2'
  | 'ASSIGNMENT'
  | 'QUIZ'
  | 'LAB'
  | 'PRACTICAL'
  | 'RECORD'
  | 'GROUP_PRESENTATION'
  | 'SEMINAR'
  | 'PROJECT'
  | 'OTHER';

export type AssessmentStatus = 'DRAFT' | 'FINALIZED';

/** Values accepted when saving grades. */
export type GradeStatus = 'GRADED' | 'ABSENT' | 'EXEMPTED';

/** Read-only label for a student with no grade row yet. Never sent to the API. */
export const NOT_GRADED = 'NOT_GRADED';
export type GradeStatusLabel = GradeStatus | typeof NOT_GRADED;

export type InternalCalculationStatus = 'PENDING_CALCULATION_CONFIGURATION' | 'CALCULATED';

// ---------- Subjects ----------

export interface Subject {
  id: number;
  code: string;
  name: string;
  subjectType: SubjectType;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SubjectRequest {
  code: string;
  name: string;
  subjectType: SubjectType;
  active: boolean;
}

export interface SubjectListQuery {
  page: number;
  size: number;
  search?: string;
  subjectType?: SubjectType;
  active?: boolean;
}

// ---------- Subject offerings ----------

export interface SubjectOffering {
  id: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectType: SubjectType;
  batchId: number;
  batchName: string;
  sectionId: number;
  sectionName: string;
  staffId: number;
  staffName: string;
  academicYear: string;
  semester: number;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SubjectOfferingRequest {
  subjectId: number;
  batchId: number;
  sectionId: number;
  staffId: number;
  academicYear: string;
  semester: number;
  active: boolean;
}

export interface SubjectOfferingListQuery {
  page: number;
  size: number;
  subjectId?: number;
  sectionId?: number;
  academicYear?: string;
  semester?: number;
  active?: boolean;
}

// ---------- Assessments ----------

export interface Assessment {
  id: number;
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectType: SubjectType;
  batchId: number;
  batchName: string;
  sectionId: number;
  sectionName: string;
  academicYear: string;
  semester: number;
  staffId: number;
  staffName: string;
  title: string;
  assessmentType: AssessmentType;
  maxMarks: number;
  passMarks: number | null;
  weightage: number | null;
  assessmentDate: string;
  status: AssessmentStatus;
  createdById: number;
  createdByName: string;
  createdAt: string | null;
  updatedAt: string | null;
  finalizedAt: string | null;
}

export interface UpdateAssessmentRequest {
  title: string;
  assessmentType: AssessmentType;
  maxMarks: number;
  passMarks?: number;
  weightage?: number;
  assessmentDate: string;
}

export interface CreateAssessmentRequest extends UpdateAssessmentRequest {
  subjectOfferingId: number;
}

export interface AssessmentListQuery {
  page: number;
  size: number;
  subjectOfferingId?: number;
  assessmentType?: AssessmentType;
  status?: AssessmentStatus;
}

// ---------- Grades ----------

/** One student of the class in GET /assessments/{id}/grades. */
export interface GradebookRow {
  studentId: number;
  registerNumber: string;
  name: string;
  gradeId: number | null;
  marks: number | null;
  gradeStatus: GradeStatusLabel;
  remarks: string | null;
  updatedAt: string | null;
}

export interface Gradebook {
  assessment: Assessment;
  expectedStudentCount: number;
  students: GradebookRow[];
}

export interface StudentGradeEntry {
  studentId: number;
  marks: number | null;
  status: GradeStatus;
  remarks: string | null;
}

export interface BulkGradeRequest {
  grades: StudentGradeEntry[];
}

export interface GradeBulkUpdateResult {
  assessmentId: number;
  subjectOfferingId: number;
  submittedCount: number;
  createdCount: number;
  updatedCount: number;
  changedGradeCount: number;
}

export interface AssessmentSummary {
  assessmentId: number;
  title: string;
  status: AssessmentStatus;
  maxMarks: number;
  passMarks: number | null;
  expectedStudentCount: number;
  gradedCount: number;
  absentCount: number;
  exemptedCount: number;
  notGradedCount: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  passCount: number | null;
  failCount: number | null;
  passPercentage: number | null;
}

/** One row of GET /grades/me — finalized assessments only. */
export interface StudentGradeView {
  assessmentId: number;
  assessmentTitle: string;
  assessmentType: AssessmentType;
  assessmentDate: string;
  maxMarks: number;
  passMarks: number | null;
  publishedAt: string | null;
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectType: SubjectType;
  academicYear: string;
  semester: number;
  marks: number | null;
  gradeStatus: GradeStatusLabel;
  remarks: string | null;
}

export interface StudentGradeQuery {
  academicYear?: string;
  semester?: number;
}

// ---------- Internal marks ----------

export interface InternalAssessmentResult {
  assessmentId: number;
  title: string;
  assessmentDate: string;
  maxMarks: number;
  marks: number | null;
  gradeStatus: GradeStatusLabel;
}

/** Totals stay null until the backend has a calculation configured. */
export interface InternalMark {
  studentId: number;
  registerNumber: string;
  name: string;
  theoryComponentTotal: number | null;
  practicalComponentTotal: number | null;
  totalInternalMarks: number | null;
  calculationStatus: InternalCalculationStatus;
  calculationVersion: string | null;
  calculatedAt: string | null;
  finalizedAssessmentsByType: Partial<Record<AssessmentType, InternalAssessmentResult[]>>;
}

export interface InternalMarks {
  offering: SubjectOffering;
  practicalComponentApplicable: boolean;
  students: InternalMark[];
}
