// /course-enrollments — item fields are camelCase (backend records); pages use the shared snake_case wrapper.

export type EnrollmentStatus = 'ENROLLED' | 'DROPPED' | 'COMPLETED';

export interface Enrollment {
  id: number;
  studentId: number;
  registerNumber: string;
  studentName: string;
  studentSectionId: number;
  studentSectionName: string;
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  offeringSectionId: number;
  offeringSectionName: string;
  academicYear: string;
  semester: number;
  staffId: number;
  staffName: string;
  status: EnrollmentStatus;
  enrolledAt: string | null;
  updatedAt: string | null;
  /** False when the course offering has since been deactivated. Absent on older backends. */
  offeringActive?: boolean;
  credits?: number | null;
}

// ---------- Registration status (contract C) — calculated by the backend, displayed as-is ----------

export type RegistrationStatus = 'ALL_REGISTERED' | 'INCOMPLETE' | 'NOT_REGISTERED' | 'REQUIREMENTS_UNKNOWN';

/** One row of GET /course-enrollments/registration-status (one per student). Counts are null without a curriculum. */
export interface StudentRegistrationRow {
  studentId: number;
  registerNumber: string;
  studentName: string;
  batchId: number;
  batchName: string;
  semester: number;
  sectionId: number;
  sectionName: string;
  registeredCount: number;
  compulsoryRegistered: number | null;
  compulsoryRequired: number | null;
  electiveGroupsSatisfied: number | null;
  electiveGroupsRequired: number | null;
  status: RegistrationStatus;
}

export interface RegistrationStatusQuery {
  batchId: number;
  semester: number;
  sectionId?: number;
  registrationStatus?: RegistrationStatus;
  search?: string;
  page: number;
  size: number;
}

/** GET /course-enrollments/registration-status/summary. All four counts are always present. */
export interface RegistrationSummary {
  totalStudents: number;
  curriculumConfigured: boolean;
  offeredCourseCount: number;
  counts: Record<RegistrationStatus, number>;
}

/** A subject line of the per-student detail. `registered` is true only for a counted enrollment. */
export interface RegistrationCourse {
  subjectId: number;
  code: string;
  name: string;
  offeringId: number | null;
  staffName: string | null;
  registered: boolean;
  enrollmentId: number | null;
  enrollmentStatus: EnrollmentStatus | null;
}

export interface RegistrationElectiveGroup {
  groupId: number;
  name: string;
  requiredSelections: number;
  selectedCount: number;
  satisfied: boolean;
  options: RegistrationCourse[];
}

/** GET /course-enrollments/registration-status/students/{studentId}?semester= */
export interface StudentRegistrationDetail {
  student: Pick<StudentRegistrationRow, 'studentId' | 'registerNumber' | 'studentName' | 'batchId' | 'batchName' | 'semester' | 'sectionId' | 'sectionName'>;
  status: RegistrationStatus;
  curriculumConfigured: boolean;
  registeredCount: number;
  compulsory: RegistrationCourse[];
  electiveGroups: RegistrationElectiveGroup[];
  /** Counted registrations outside the curriculum (all of them when no curriculum is configured). */
  otherRegistrations: RegistrationCourse[];
}

export interface EnrollmentListQuery {
  page: number;
  size: number;
  subjectOfferingId?: number;
  sectionId?: number;
  studentId?: number;
  status?: EnrollmentStatus;
}

export interface EnrollStudentRequest {
  studentId: number;
  subjectOfferingId: number;
}

/** Result of POST /course-enrollments/subject-offerings/{id}/enroll-section. */
export interface SectionEnrollmentResult {
  subjectOfferingId: number;
  sectionId: number;
  activeStudentsInSection: number;
  enrolled: number;
  alreadyEnrolled: number;
  skippedDropped: number;
  skippedCompleted: number;
}
