// /timetable — plain lists (not paginated), camelCase fields.

export type TimetableSlotType = 'LECTURE' | 'LAB' | 'TUTORIAL' | 'OTHER';

/** java.time.DayOfWeek as serialized by the backend. */
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface TimetableSlot {
  id: number;
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  batchId: number;
  batchName: string;
  sectionId: number;
  sectionName: string;
  staffId: number;
  staffName: string;
  academicYear: string;
  semester: number;
  dayOfWeek: DayOfWeek;
  periodNumber: number | null;
  /** "HH:mm:ss" (or "HH:mm"). */
  startTime: string;
  endTime: string;
  room: string | null;
  slotType: TimetableSlotType;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TimetableListQuery {
  batchId?: number;
  sectionId?: number;
  staffId?: number;
  subjectOfferingId?: number;
  dayOfWeek?: DayOfWeek;
  active?: boolean;
}

/** Times as "HH:mm". slotType defaults to LECTURE on the backend. */
export interface TimetableSlotRequest {
  subjectOfferingId: number;
  dayOfWeek: DayOfWeek;
  periodNumber: number | null;
  startTime: string;
  endTime: string;
  room: string | null;
  slotType: TimetableSlotType;
}
