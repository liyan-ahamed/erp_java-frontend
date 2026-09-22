export type ScheduleType = 'DEADLINE' | 'MEETING';

export interface Staff {
  id: number;
  name: string;
  email: string;
}

export interface CreateSchedulePayload {
  staff_ids: number[];
  schedule_type: ScheduleType;
  title: string;
  date: string;
  time: string;
}

export interface Schedule {
  id: number;
  schedule_type: ScheduleType;
  title: string;
  schedule_date: string;
  schedule_time: string;
  staff_id: number;
  staff_name: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export interface HodSchedule extends Schedule {
  completed: boolean;
}

export type StudentScheduleType = 'POLL' | 'DEADLINE';

export interface ScheduleAudience {
  classes: { id: number; name: string }[];
  students: { id: number; name: string; registerNumber: string; sectionId: number }[];
}

export interface CreateStudentSchedulePayload {
  type: StudentScheduleType;
  title: string;
  details?: string;
  due_date?: string;
  due_time?: string;
  section_ids: number[];
  student_ids: number[];
  options?: string[];
}

export interface StudentSchedule {
  id: number;
  type: StudentScheduleType;
  title: string;
  details?: string;
  due_date?: string;
  due_time?: string;
  options: string[];
  classes: string[];
  students: string[];
  created_by_name: string;
  created_at: string;
  responded: boolean;
  selected_option_index: number | null;
}
