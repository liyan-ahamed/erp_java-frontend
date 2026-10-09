import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import {
  FeedbackAnalytics,
  FeedbackForm,
  FeedbackFormListQuery,
  FeedbackFormRequest,
  FeedbackResponses,
  FeedbackSubmission,
} from '@/types/feedback';

/** HOD manages forms and sees results; STUDENT answers targeted forms once; STAFF have no access. */
export const feedbackService = {
  getForms: async (query: FeedbackFormListQuery): Promise<PaginatedResponse<FeedbackForm>> => {
    const response = await apiClient.get(API_ENDPOINTS.FEEDBACK.FORMS, { params: query });
    return mapPage(response.data.data as BackendPage<FeedbackForm>);
  },

  getMyForms: async (): Promise<FeedbackForm[]> => {
    const response = await apiClient.get(API_ENDPOINTS.FEEDBACK.MY_FORMS);
    return response.data.data;
  },

  getForm: async (id: number): Promise<FeedbackForm> => {
    const response = await apiClient.get(API_ENDPOINTS.FEEDBACK.FORM(id));
    return response.data.data;
  },

  createForm: async (payload: FeedbackFormRequest): Promise<FeedbackForm> => {
    const response = await apiClient.post(API_ENDPOINTS.FEEDBACK.FORMS, payload);
    return response.data.data;
  },

  /** DRAFT only; the question list is replaced. */
  updateForm: async (id: number, payload: FeedbackFormRequest): Promise<FeedbackForm> => {
    const response = await apiClient.put(API_ENDPOINTS.FEEDBACK.FORM(id), payload);
    return response.data.data;
  },

  openForm: async (id: number): Promise<FeedbackForm> => {
    const response = await apiClient.post(API_ENDPOINTS.FEEDBACK.OPEN(id));
    return response.data.data;
  },

  closeForm: async (id: number): Promise<FeedbackForm> => {
    const response = await apiClient.post(API_ENDPOINTS.FEEDBACK.CLOSE(id));
    return response.data.data;
  },

  getAnalytics: async (id: number): Promise<FeedbackAnalytics> => {
    const response = await apiClient.get(API_ENDPOINTS.FEEDBACK.ANALYTICS(id));
    return response.data.data;
  },

  getResponses: async (id: number): Promise<FeedbackResponses> => {
    const response = await apiClient.get(API_ENDPOINTS.FEEDBACK.RESPONSES(id));
    return response.data.data;
  },

  submit: async (id: number, payload: FeedbackSubmission): Promise<FeedbackForm> => {
    const response = await apiClient.post(API_ENDPOINTS.FEEDBACK.SUBMIT(id), payload);
    return response.data.data;
  },
};
