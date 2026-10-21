import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';

/**
 * The signed-in user's own account. Only ever acts on the current user (the backend identifies them from
 * the JWT); there is no user id in these calls. Not called while features.accountSelfService is off.
 */
export const accountService = {
  changeEmail: async (payload: { currentPassword: string; newEmail: string }) => {
    const response = await apiClient.put(API_ENDPOINTS.ACCOUNT.EMAIL, payload);
    return response.data.data;
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    const response = await apiClient.put(API_ENDPOINTS.ACCOUNT.PASSWORD, payload);
    return response.data.data;
  },
};
