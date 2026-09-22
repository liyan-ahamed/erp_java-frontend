import { apiClient } from '@/lib/axios';
import { CreateSchedulePayload, CreateStudentSchedulePayload, Schedule, ScheduleAudience, Staff, StudentSchedule, StudentScheduleType } from '@/types/schedule';
import { removeAccessToken, removeRefreshToken } from '@/utils/token';
import { ROUTES } from '@/constants/routes';

const handleApiError = (response: any) => {
  if (response.data && response.data.success === false) {
    if (response.data.message === 'Not authenticated') {
      removeAccessToken();
      removeRefreshToken();
      if (typeof window !== 'undefined') {
        window.location.href = ROUTES.LOGIN;
      }
    }
    throw new Error(response.data.message || 'API Error');
  }
};

export const scheduleService = {
  getAudience: async (): Promise<ScheduleAudience> => {
    const response = await apiClient.get('/student-schedules/audience');
    handleApiError(response);
    return response.data.data;
  },

  createStudentSchedule: async (payload: CreateStudentSchedulePayload): Promise<StudentSchedule> => {
    const response = await apiClient.post('/student-schedules', payload);
    handleApiError(response);
    return response.data.data;
  },

  getStudentSchedules: async (type: StudentScheduleType): Promise<StudentSchedule[]> => {
    const response = await apiClient.get('/student-schedules', { params: { type } });
    handleApiError(response);
    return response.data.data;
  },

  submitPollResponse: async (pollId: number, optionIndex: number): Promise<StudentSchedule> => {
    const response = await apiClient.post(`/student-schedules/${pollId}/response`, { option_index: optionIndex });
    handleApiError(response);
    return response.data.data;
  },

  getStaff: async (): Promise<Staff[]> => {
    const response = await apiClient.get('/schedules/staff');
    handleApiError(response);
    return response.data.data;
  },

  createSchedule: async (payload: CreateSchedulePayload): Promise<any> => {
    const response = await apiClient.post('/schedules', payload);
    handleApiError(response);
    return response.data;
  },

  getSchedules: async (type?: 'DEADLINE' | 'MEETING'): Promise<Schedule[]> => {
    const params = type ? { type } : undefined;
    const response = await apiClient.get('/schedules', { params });
    handleApiError(response);
    return response.data.data;
  },

  deleteSchedule: async (id: number): Promise<any> => {
    const response = await apiClient.delete(`/schedules/${id}`);
    handleApiError(response);
    return response.data;
  },
};
