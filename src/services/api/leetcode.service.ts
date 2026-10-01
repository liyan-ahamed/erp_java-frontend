import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { LeetCodeFilters, LeetCodeSectionStats, LeetCodeStudentStats, LeetCodeYear } from '@/types/leetcode';
import { removeAccessToken, removeRefreshToken } from '@/utils/token';
import { ROUTES } from '@/constants/routes';

// A section is fetched from LeetCode by the backend profile-by-profile, which
// takes longer than the default 10s client timeout.
const SYNC_TIMEOUT_MS = 180_000;

const handleApiError = (response: { data?: { success?: boolean; message?: string } }) => {
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

export const leetcodeService = {
  getFilters: async (): Promise<LeetCodeFilters> => {
    const response = await apiClient.get(API_ENDPOINTS.LEETCODE.FILTERS);
    handleApiError(response);
    return response.data.data;
  },

  fetchSectionStats: async (year: LeetCodeYear, section: string): Promise<LeetCodeSectionStats> => {
    const response = await apiClient.get(API_ENDPOINTS.LEETCODE.STATS, {
      params: { year, section },
      timeout: SYNC_TIMEOUT_MS,
    });
    handleApiError(response);
    return response.data.data;
  },

  getMyProfile: async (): Promise<LeetCodeStudentStats> => {
    const response = await apiClient.get(API_ENDPOINTS.LEETCODE.ME);
    handleApiError(response);
    return response.data.data;
  },

  fetchMyStats: async (): Promise<LeetCodeStudentStats> => {
    const response = await apiClient.get(API_ENDPOINTS.LEETCODE.ME_STATS, { timeout: SYNC_TIMEOUT_MS });
    handleApiError(response);
    return response.data.data;
  },
};
