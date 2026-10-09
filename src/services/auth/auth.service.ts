import { apiClient } from '@/lib/axios';

// Token refresh is handled by the axios response interceptor in lib/axios.ts.
export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  }
};
