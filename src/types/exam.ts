// /exam-periods and /exam-registrations — camelCase fields.
import { SubjectType } from '@/types/gradebook';

export type ExamType = 'INTERNAL' | 'END_SEMESTER' | 'SUPPLEMENTARY';

export type ExamPeriodStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

export type ExamRegistrationStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface ExamPeriod {
  id: number;
  name: string;
  academicYear: string;
  semester: number;
  examType: ExamType;
  registrationStart: string;
  registrationEnd: string;
  status: ExamPeriodStatus;
  /** OPEN and today inside the registration window (backend clock). */
  registrationWindowOpen: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ExamPeriodListQuery {
  page: number;
  size: number;
  academicYear?: string;
  semester?: number;
  examType?: ExamType;
  status?: ExamPeriodStatus;
}

/** DRAFT: every field. OPEN: name and registration dates only. CLOSED: not editable. */
export interface ExamPeriodRequest {
  name: string;
  academicYear: string;
  semester: number;
  examType: ExamType;
  registrationStart: string;
  registrationEnd: string;
}

/** GET /exam-registrations/periods — an OPEN period with the student's registration status. */
export interface StudentExamPeriod {
  period: ExamPeriod;
  eligibleSubjects: number;
  registrationId: number | null;
  registrationStatus: ExamRegistrationStatus | null;
}

export interface EligibleSubject {
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectType: SubjectType;
  staffName: string;
  selected: boolean;
}

export interface ExamRegistrationSubject {
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
}

export interface ExamRegistration {
  id: number;
  examPeriodId: number;
  examPeriodName: string;
  examType: ExamType;
  studentId: number;
  registerNumber: string;
  studentName: string;
  sectionName: string;
  status: ExamRegistrationStatus;
  submittedAt: string | null;
  reviewedById: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  subjects: ExamRegistrationSubject[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ExamRegistrationListQuery {
  page: number;
  size: number;
  examPeriodId?: number;
  status?: ExamRegistrationStatus;
  sectionId?: number;
  studentId?: number;
}

/** The full set of subject offerings to register for (replaces the previous selection). */
export interface SaveRegistrationRequest {
  subjectOfferingIds: number[];
}

/** Optional on approval; required (5+ characters) on rejection. */
export interface ReviewRegistrationRequest {
  reviewNote: string | null;
}
