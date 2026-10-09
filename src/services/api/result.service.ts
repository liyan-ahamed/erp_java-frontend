import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import { BulkResultRequest, ExamResult, ResultBatch, ResultListQuery, ResultSheet } from '@/types/result';

/** STAFF enter results for their own offerings, HOD publishes, STUDENT sees published results only. */
export const resultService = {
  getResults: async (query: ResultListQuery): Promise<PaginatedResponse<ExamResult>> => {
    const response = await apiClient.get(API_ENDPOINTS.RESULTS.BASE, { params: query });
    return mapPage(response.data.data as BackendPage<ExamResult>);
  },

  getMyResults: async (): Promise<ExamResult[]> => {
    const response = await apiClient.get(API_ENDPOINTS.RESULTS.ME);
    return response.data.data;
  },

  getSheet: async (offeringId: number, periodId: number): Promise<ResultSheet> => {
    const response = await apiClient.get(API_ENDPOINTS.RESULTS.SHEET(offeringId, periodId));
    return response.data.data;
  },

  saveSheet: async (offeringId: number, periodId: number, payload: BulkResultRequest): Promise<ResultBatch> => {
    const response = await apiClient.put(API_ENDPOINTS.RESULTS.SHEET(offeringId, periodId), payload);
    return response.data.data;
  },

  publish: async (offeringId: number, periodId: number): Promise<ResultBatch> => {
    const response = await apiClient.post(API_ENDPOINTS.RESULTS.PUBLISH(offeringId, periodId));
    return response.data.data;
  },
};
