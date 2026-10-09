import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import { Subject, SubjectListQuery, SubjectRequest } from '@/types/gradebook';

export const subjectService = {
  getSubjects: async ({ page, size, search, subjectType, active }: SubjectListQuery): Promise<PaginatedResponse<Subject>> => {
    const response = await apiClient.get(API_ENDPOINTS.SUBJECTS.BASE, {
      params: { page, size, search: search || undefined, subjectType, active },
    });
    return mapPage(response.data.data as BackendPage<Subject>);
  },

  createSubject: async (payload: SubjectRequest): Promise<Subject> => {
    const response = await apiClient.post(API_ENDPOINTS.SUBJECTS.BASE, payload);
    return response.data.data;
  },

  updateSubject: async (id: number, payload: SubjectRequest): Promise<Subject> => {
    const response = await apiClient.put(API_ENDPOINTS.SUBJECTS.BY_ID(id), payload);
    return response.data.data;
  },
};
