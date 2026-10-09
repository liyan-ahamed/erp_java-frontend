import { apiClient } from '@/lib/axios';
import { CreateStudentSchedulePayload, ScheduleAudience, StudentSchedule, StudentScheduleType } from '@/types/schedule';

export const scheduleService = {
  getAudience: async (): Promise<ScheduleAudience> => {
    const response = await apiClient.get('/student-schedules/audience');
    return response.data.data;
  },

  createStudentSchedule: async (payload: CreateStudentSchedulePayload): Promise<StudentSchedule> => {
    const response = await apiClient.post('/student-schedules', payload);
    return response.data.data;
  },

  getStudentSchedules: async (type: StudentScheduleType): Promise<StudentSchedule[]> => {
    const response = await apiClient.get('/student-schedules', { params: { type } });
    return response.data.data;
  },

  submitPollResponse: async (pollId: number, optionIndex: number): Promise<StudentSchedule> => {
    const response = await apiClient.post(`/student-schedules/${pollId}/response`, { option_index: optionIndex });
    return response.data.data;
  },
};
