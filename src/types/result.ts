// /results — formal exam results. camelCase fields. No GPA/CGPA exists on the backend.
import { ExamType } from '@/types/exam';

export type ResultStatus = 'PASS' | 'FAIL' | 'ABSENT' | 'WITHHELD';

/** Display-only status the result sheet returns for students without a result. Never sent. */
export const NOT_ENTERED = 'NOT_ENTERED';
export type ResultSheetStatus = ResultStatus | typeof NOT_ENTERED;

export interface ExamResult {
  id: number;
  studentId: number;
  registerNumber: string;
  studentName: string;
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  academicYear: string;
  semester: number;
  examPeriodId: number;
  examPeriodName: string;
  examType: ExamType;
  marksObtained: number | null;
  maxMarks: number;
  grade: string | null;
  resultStatus: ResultStatus;
  remarks: string | null;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface ResultListQuery {
  page: number;
  size: number;
  examPeriodId?: number;
  subjectOfferingId?: number;
  sectionId?: number;
  studentId?: number;
  published?: boolean;
  resultStatus?: ResultStatus;
}

export interface ResultSheetRow {
  studentId: number;
  registerNumber: string;
  studentName: string;
  enrolled: boolean;
  resultId: number | null;
  marksObtained: number | null;
  maxMarks: number | null;
  grade: string | null;
  resultStatus: ResultSheetStatus;
  remarks: string | null;
  published: boolean;
}

export interface ResultSheet {
  subjectOfferingId: number;
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  examPeriodId: number;
  examPeriodName: string;
  students: number;
  entered: number;
  published: number;
  rows: ResultSheetRow[];
}

/**
 * PASS / FAIL need marksObtained; ABSENT has no marks and no grade; WITHHELD may keep marks.
 * grade is a short label (1-5 letters, + or -).
 */
export interface ResultEntry {
  studentId: number;
  marksObtained: number | null;
  maxMarks: number;
  grade: string | null;
  resultStatus: ResultStatus;
  remarks: string | null;
}

export interface BulkResultRequest {
  results: ResultEntry[];
}

/** Counts of a bulk save (created/updated/unchanged) or of a publish (published). */
export interface ResultBatch {
  subjectOfferingId: number;
  examPeriodId: number;
  received: number;
  created: number;
  updated: number;
  unchanged: number;
  published: number;
}
