import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import { SubjectOffering, SubjectOfferingListQuery, SubjectOfferingRequest } from '@/types/gradebook';

/** STAFF only ever receive their own offerings — the backend scopes the list. */
export const subjectOfferingService = {
  getOfferings: async (query: SubjectOfferingListQuery): Promise<PaginatedResponse<SubjectOffering>> => {
    const response = await apiClient.get(API_ENDPOINTS.SUBJECT_OFFERINGS.BASE, { params: query });
    return mapPage(response.data.data as BackendPage<SubjectOffering>);
  },

  getOffering: async (id: number): Promise<SubjectOffering> => {
    const response = await apiClient.get(API_ENDPOINTS.SUBJECT_OFFERINGS.BY_ID(id));
    return response.data.data;
  },

  createOffering: async (payload: SubjectOfferingRequest): Promise<SubjectOffering> => {
    const response = await apiClient.post(API_ENDPOINTS.SUBJECT_OFFERINGS.BASE, payload);
    return response.data.data;
  },

  updateOffering: async (id: number, payload: SubjectOfferingRequest): Promise<SubjectOffering> => {
    const response = await apiClient.put(API_ENDPOINTS.SUBJECT_OFFERINGS.BY_ID(id), payload);
    return response.data.data;
  },
};
