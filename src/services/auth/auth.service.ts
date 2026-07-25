import { apiClient } from '@/lib/axios';

export interface LoginCredentials {
  email: string;
  password?: string; // Add if you use password. The plan has login(email, password)
}

export const authService = {
  login: async (email: string, password?: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data.data;
  },

  refresh: async (refreshToken: string) => {
    // Note: Use standard axios to avoid interceptor loops if needed, 
    // but the plan says POST /auth/refresh so we can use apiClient or axios directly.
    // If we use apiClient, we might need to handle circular dependency or interceptors carefully.
    // We'll use apiClient but we'll see in axios.ts
    const response = await apiClient.post('/auth/refresh', { refreshToken });
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
