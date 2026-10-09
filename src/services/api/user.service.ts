import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import { CreateUserPayload, ManagedUser, UpdateUserPayload, UserListQuery } from '@/types/user-management';

export const userService = {
  getUsers: async ({ page, size, search, active }: UserListQuery): Promise<PaginatedResponse<ManagedUser>> => {
    const response = await apiClient.get(API_ENDPOINTS.USERS.BASE, {
      params: { page, size, search: search || undefined, active },
    });
    return mapPage(response.data.data as BackendPage<ManagedUser>);
  },

  getUser: async (id: number): Promise<ManagedUser> => {
    const response = await apiClient.get(API_ENDPOINTS.USERS.BY_ID(id));
    return response.data.data;
  },

  createUser: async (payload: CreateUserPayload): Promise<ManagedUser> => {
    const response = await apiClient.post(API_ENDPOINTS.USERS.BASE, payload);
    return response.data.data;
  },

  updateUser: async (id: number, payload: UpdateUserPayload): Promise<ManagedUser> => {
    const response = await apiClient.put(API_ENDPOINTS.USERS.BY_ID(id), payload);
    return response.data.data;
  },

  deactivateUser: async (id: number): Promise<ManagedUser> => {
    const response = await apiClient.patch(API_ENDPOINTS.USERS.DEACTIVATE(id));
    return response.data.data;
  },

  reactivateUser: async (id: number): Promise<ManagedUser> => {
    const response = await apiClient.patch(API_ENDPOINTS.USERS.REACTIVATE(id));
    return response.data.data;
  },
};
