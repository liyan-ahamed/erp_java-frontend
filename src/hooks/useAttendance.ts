import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/api/attendance.service';
import { AttendanceFilters } from '@/types/attendance';

const KEYS = {
  attendanceSummary: 'attendanceSummary',
  attendanceRecords: 'attendanceRecords',
  employeeAttendance: 'employeeAttendance',
  attendanceAnalytics: 'attendanceAnalytics',
  employees: 'employees',
};

export const useAttendanceSummary = (date?: string) => {
  return useQuery({
    queryKey: [KEYS.attendanceSummary, date],
    queryFn: () => attendanceService.getSummary(date),
  });
};

export const useAttendanceRecords = (filters: AttendanceFilters = {}) => {
  return useQuery({
    queryKey: [KEYS.attendanceRecords, filters],
    queryFn: () => attendanceService.getRecords(filters),
  });
};

export const useEmployeeAttendance = (employeeId: number | null) => {
  return useQuery({
    queryKey: [KEYS.employeeAttendance, employeeId],
    queryFn: () => attendanceService.getEmployeeProfile(employeeId!),
    enabled: employeeId !== null,
  });
};

export const useAttendanceAnalytics = () => {
  return useQuery({
    queryKey: [KEYS.attendanceAnalytics],
    queryFn: () => attendanceService.getAnalytics(),
  });
};
