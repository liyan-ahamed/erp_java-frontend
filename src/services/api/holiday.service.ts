import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { Holiday, HolidayCalendarInfo, HolidayListQuery, HolidayRequest } from '@/types/holiday';

/**
 * College holiday calendar. Reads: every role (STAFF / STUDENT only ever receive published years).
 * Writes and publication: HOD only — the backend enforces it.
 */
export const holidayService = {
  getHolidays: async (query: HolidayListQuery): Promise<Holiday[]> => {
    const response = await apiClient.get(API_ENDPOINTS.HOLIDAYS.BASE, { params: query });
    return response.data.data;
  },

  getCalendar: async (year: number): Promise<HolidayCalendarInfo> => {
    const response = await apiClient.get(API_ENDPOINTS.HOLIDAYS.CALENDAR(year));
    return response.data.data;
  },

  publish: async (year: number): Promise<HolidayCalendarInfo> => {
    const response = await apiClient.post(API_ENDPOINTS.HOLIDAYS.PUBLISH(year));
    return response.data.data;
  },

  unpublish: async (year: number): Promise<HolidayCalendarInfo> => {
    const response = await apiClient.post(API_ENDPOINTS.HOLIDAYS.UNPUBLISH(year));
    return response.data.data;
  },

  createHoliday: async (payload: HolidayRequest): Promise<Holiday> => {
    const response = await apiClient.post(API_ENDPOINTS.HOLIDAYS.BASE, payload);
    return response.data.data;
  },

  updateHoliday: async (id: number, payload: HolidayRequest): Promise<Holiday> => {
    const response = await apiClient.put(API_ENDPOINTS.HOLIDAYS.BY_ID(id), payload);
    return response.data.data;
  },

  deleteHoliday: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.HOLIDAYS.BY_ID(id));
  },
};
