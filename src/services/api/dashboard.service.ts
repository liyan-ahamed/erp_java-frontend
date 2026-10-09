import { apiClient } from '@/lib/axios';
import { DashboardSummary } from '@/types/dashboard';
import { API_ENDPOINTS } from '@/constants/api';

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.SUMMARY);
    return response.data.data;
  },
};
