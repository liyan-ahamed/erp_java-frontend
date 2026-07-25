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
