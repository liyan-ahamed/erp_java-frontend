// /attendance — academic class attendance (sessions per subject offering). camelCase fields.

export type AttendanceSessionStatus = 'DRAFT' | 'FINALIZED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'ON_DUTY' | 'EXCUSED';

/** Display-only value the records endpoint returns for students without a mark. Never sent. */
export const NOT_MARKED = 'NOT_MARKED';
export type AttendanceRecordStatus = AttendanceStatus | typeof NOT_MARKED;

export interface AttendanceSession {
  id: number;
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  sectionId: number;
  sectionName: string;
  staffId: number;
  staffName: string;
  attendanceDate: string;
  timetableSlotId: number | null;
  periodNumber: number | null;
  topic: string | null;
  status: AttendanceSessionStatus;
  createdById: number;
  createdAt: string | null;
  updatedAt: string | null;
  finalizedAt: string | null;
}

export interface AttendanceSessionListQuery {
  page: number;
  size: number;
  subjectOfferingId?: number;
  sectionId?: number;
  status?: AttendanceSessionStatus;
  from?: string;
  to?: string;
}

export interface CreateAttendanceSessionRequest {
  subjectOfferingId: number;
  attendanceDate: string;
  timetableSlotId: number | null;
  periodNumber: number | null;
  topic: string | null;
}

export type UpdateAttendanceSessionRequest = Omit<CreateAttendanceSessionRequest, 'subjectOfferingId'>;

/** One roster row of GET /attendance/sessions/{id}/records. */
export interface AttendanceRecord {
  studentId: number;
  registerNumber: string;
  studentName: string;
  /** false = marked earlier but no longer enrolled. */
  inRoster: boolean;
  recordId: number | null;
  status: AttendanceRecordStatus;
  remarks: string | null;
  updatedAt: string | null;
}

export interface SessionRecords {
  session: AttendanceSession;
  rosterSize: number;
  marked: number;
  notMarked: number;
  records: AttendanceRecord[];
}

export interface BulkAttendanceRequest {
  records: { studentId: number; status: AttendanceStatus; remarks: string | null }[];
}

export interface BulkAttendanceResult {
  sessionId: number;
  received: number;
  created: number;
  updated: number;
  unchanged: number;
  rosterSize: number;
  notMarked: number;
}

/**
 * Figures over FINALIZED sessions, calculated by the backend. attendancePercentage and
 * shortagePercentagePoints are null when there is nothing to count.
 */
export interface AttendanceSummary {
  totalSessions: number;
  present: number;
  absent: number;
  onDuty: number;
  excused: number;
  attended: number;
  eligible: number;
  attendancePercentage: number | null;
  minimumRequiredPercentage: number;
  belowThreshold: boolean;
  shortagePercentagePoints: number | null;
}

/** GET /attendance/me — one subject of the student's attendance. */
export interface SubjectAttendance extends AttendanceSummary {
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  academicYear: string;
  semester: number;
  staffName: string;
}

export interface ClassAttendanceRow extends AttendanceSummary {
  studentId: number;
  registerNumber: string;
  studentName: string;
}

/** GET /attendance/subject-offerings/{id}/summary. */
export interface ClassAttendanceSummary {
  subjectOfferingId: number;
  subjectCode: string;
  subjectName: string;
  sectionId: number;
  sectionName: string;
  finalizedSessions: number;
  minimumRequiredPercentage: number;
  studentsBelowThreshold: number;
  students: ClassAttendanceRow[];
}
