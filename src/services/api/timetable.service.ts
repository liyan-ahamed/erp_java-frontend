import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { TimetableListQuery, TimetableSlot, TimetableSlotRequest } from '@/types/timetable';

/** HOD manages slots; STAFF read their own; STAFF and STUDENT get /me. Lists are not paginated. */
export const timetableService = {
  getSlots: async (query: TimetableListQuery): Promise<TimetableSlot[]> => {
    const response = await apiClient.get(API_ENDPOINTS.TIMETABLE.BASE, { params: query });
    return response.data.data;
  },

  getMyTimetable: async (): Promise<TimetableSlot[]> => {
    const response = await apiClient.get(API_ENDPOINTS.TIMETABLE.ME);
    return response.data.data;
  },

  createSlot: async (payload: TimetableSlotRequest): Promise<TimetableSlot> => {
    const response = await apiClient.post(API_ENDPOINTS.TIMETABLE.BASE, payload);
    return response.data.data;
  },

  updateSlot: async (id: number, payload: TimetableSlotRequest): Promise<TimetableSlot> => {
    const response = await apiClient.put(API_ENDPOINTS.TIMETABLE.BY_ID(id), payload);
    return response.data.data;
  },

  /** Soft delete: the backend deactivates the slot. */
  deleteSlot: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.TIMETABLE.BY_ID(id));
  },
};
