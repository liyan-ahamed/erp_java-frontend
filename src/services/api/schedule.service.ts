import { apiClient } from '@/lib/axios';
import { CreateSchedulePayload, Schedule, Staff } from '@/types/schedule';
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
