import { AttendanceFilters, AttendanceSummary, AttendanceAnalytics, EmployeeAttendanceProfile } from '@/types/attendance';
import {
  mockAttendanceRecords,
  mockEmployees,
  getAttendanceSummary as getSummary,
  getAttendanceAnalytics as getAnalytics,
  getEmployeeAttendanceProfile as getProfile,
} from '@/data/attendance-data';
import { PaginatedResponse } from '@/types/api';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const attendanceService = {
  getSummary: async (date?: string): Promise<AttendanceSummary> => {
    await delay(300);
    return getSummary(date);
  },

  getRecords: async (filters: AttendanceFilters = {}): Promise<PaginatedResponse<typeof mockAttendanceRecords[0]>> => {
    await delay(400);
    let result = [...mockAttendanceRecords];

    // Default to today or latest available date
    if (filters.date) {
      result = result.filter(r => r.date === filters.date);
    } else {
      // Get latest working day records
      const dates = [...new Set(result.map(r => r.date))].sort().reverse();
      const latestWork = dates.find(d => {
        const dd = new Date(d);
        return dd.getDay() !== 0 && dd.getDay() !== 6;
      });
      if (latestWork) {
        result = result.filter(r => r.date === latestWork);
      }
    }

    if (filters.department) {
      result = result.filter(r => r.department === filters.department);
    }

    if (filters.status) {
      result = result.filter(r => r.status === filters.status);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(r =>
        r.employee_name.toLowerCase().includes(q) ||
        r.employee_code.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      );
    }

    if (filters.manager) {
      result = result.filter(r => r.manager === filters.manager);
    }

    const page = filters.page || 0;
    const size = filters.size || 15;
    const start = page * size;
    const content = result.slice(start, start + size);

    return {
      content,
      totalElements: result.length,
      totalPages: Math.ceil(result.length / size),
      size,
      number: page,
    };
  },

  getEmployeeProfile: async (employeeId: number): Promise<EmployeeAttendanceProfile | null> => {
    await delay(300);
    return getProfile(employeeId);
  },

  getAnalytics: async (): Promise<AttendanceAnalytics> => {
    await delay(400);
    return getAnalytics();
  },

  getEmployees: async () => {
    await delay(200);
    return mockEmployees;
  },
};
