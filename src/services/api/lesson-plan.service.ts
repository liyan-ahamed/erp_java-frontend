import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import {
  CompleteLessonPlanRequest,
  CreateLessonPlanRequest,
  LessonPlan,
  LessonPlanListQuery,
  LessonPlanSummary,
  UpdateLessonPlanRequest,
} from '@/types/lesson-plan';

/** STAFF manage plans of their own offerings; HOD reads all; STUDENT reads /me. */
export const lessonPlanService = {
  getPlans: async (query: LessonPlanListQuery): Promise<PaginatedResponse<LessonPlan>> => {
    const response = await apiClient.get(API_ENDPOINTS.LESSON_PLANS.BASE, { params: query });
    return mapPage(response.data.data as BackendPage<LessonPlan>);
  },

  getMyPlans: async (): Promise<LessonPlan[]> => {
    const response = await apiClient.get(API_ENDPOINTS.LESSON_PLANS.ME);
    return response.data.data;
  },

  getProgress: async (offeringId: number): Promise<LessonPlanSummary> => {
    const response = await apiClient.get(API_ENDPOINTS.LESSON_PLANS.PROGRESS(offeringId));
    return response.data.data;
  },

  createPlan: async (payload: CreateLessonPlanRequest): Promise<LessonPlan> => {
    const response = await apiClient.post(API_ENDPOINTS.LESSON_PLANS.BASE, payload);
    return response.data.data;
  },

  updatePlan: async (id: number, payload: UpdateLessonPlanRequest): Promise<LessonPlan> => {
    const response = await apiClient.put(API_ENDPOINTS.LESSON_PLANS.BY_ID(id), payload);
    return response.data.data;
  },

  completePlan: async (id: number, payload: CompleteLessonPlanRequest): Promise<LessonPlan> => {
    const response = await apiClient.post(API_ENDPOINTS.LESSON_PLANS.COMPLETE(id), payload);
    return response.data.data;
  },

  cancelPlan: async (id: number): Promise<LessonPlan> => {
    const response = await apiClient.post(API_ENDPOINTS.LESSON_PLANS.CANCEL(id));
    return response.data.data;
  },

  reopenPlan: async (id: number): Promise<LessonPlan> => {
    const response = await apiClient.post(API_ENDPOINTS.LESSON_PLANS.REOPEN(id));
    return response.data.data;
  },
};
