import { apiClient } from '@/lib/axios';
import { DashboardSummary } from '@/types/dashboard';
import { removeAccessToken, removeRefreshToken } from '@/utils/token';
import { ROUTES } from '@/constants/routes';

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get('/dashboard/summary');
    
    // Handle cases where API returns 200 OK but with success: false
    if (response.data && response.data.success === false) {
      if (response.data.message === 'Not authenticated') {
        removeAccessToken();
        removeRefreshToken();
        if (typeof window !== 'undefined') {
          window.location.href = ROUTES.LOGIN;
        }
      }
      throw new Error(response.data.message || 'Failed to fetch dashboard data');
    }
    
    // The response format might vary slightly depending on how the interceptor modifies it, 
    // but typically it's response.data.data according to the sample response
    return response.data.data;
  },
};
