export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'WORK_FROM_HOME'
  | 'ON_LEAVE'
  | 'WEEKEND'
  | 'HOLIDAY';

export interface Employee {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  manager: string;
  avatar_url?: string;
  joined_date: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  department: string;
  designation: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  break_duration: number; // minutes
  working_hours: number;
  overtime: number;
  status: AttendanceStatus;
  location: string;
  manager: string;
  attendance_percentage: number;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  half_day: number;
  on_leave: number;
  work_from_home: number;
  attendance_percentage: number;
  average_working_hours: number;
  total_employees: number;
}

export interface AttendanceFilters {
  date?: string;
  department?: string;
  status?: AttendanceStatus | '';
  search?: string;
  manager?: string;
  location?: string;
  page?: number;
  size?: number;
}

export interface EmployeeAttendanceProfile {
  employee: Employee;
  summary: AttendanceSummary;
  monthly_records: AttendanceRecord[];
  attendance_percentage: number;
  average_working_hours: number;
  total_late_arrivals: number;
  total_leaves_taken: number;
  working_hour_trend: { date: string; hours: number }[];
}

export interface AttendanceAnalytics {
  daily_trend: { date: string; present: number; absent: number; late: number }[];
  department_comparison: { department: string; percentage: number }[];
  late_arrival_trend: { date: string; count: number }[];
  working_hours_distribution: { range: string; count: number }[];
  leave_distribution: { type: string; count: number }[];
  remote_vs_office: { remote: number; office: number };
}
