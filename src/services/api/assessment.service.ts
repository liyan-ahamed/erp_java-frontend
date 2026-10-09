import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import {
  Assessment,
  AssessmentListQuery,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
} from '@/types/gradebook';

export const assessmentService = {
  getAssessments: async (query: AssessmentListQuery): Promise<PaginatedResponse<Assessment>> => {
    const response = await apiClient.get(API_ENDPOINTS.ASSESSMENTS.BASE, { params: query });
    return mapPage(response.data.data as BackendPage<Assessment>);
  },

  getAssessment: async (id: number): Promise<Assessment> => {
    const response = await apiClient.get(API_ENDPOINTS.ASSESSMENTS.BY_ID(id));
    return response.data.data;
  },

  createAssessment: async (payload: CreateAssessmentRequest): Promise<Assessment> => {
    const response = await apiClient.post(API_ENDPOINTS.ASSESSMENTS.BASE, payload);
    return response.data.data;
  },

  updateAssessment: async (id: number, payload: UpdateAssessmentRequest): Promise<Assessment> => {
    const response = await apiClient.put(API_ENDPOINTS.ASSESSMENTS.BY_ID(id), payload);
    return response.data.data;
  },

  deleteAssessment: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.ASSESSMENTS.BY_ID(id));
  },

  finalizeAssessment: async (id: number): Promise<Assessment> => {
    const response = await apiClient.post(API_ENDPOINTS.ASSESSMENTS.FINALIZE(id));
    return response.data.data;
  },
};
