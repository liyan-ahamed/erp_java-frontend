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
