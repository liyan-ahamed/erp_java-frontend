import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { Batch, Section } from '@/types/academic';

/** Read-only academic structure lookups (active batches and their sections). */
export const academicService = {
  getBatches: async (): Promise<Batch[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ACADEMIC.BATCHES);
    return response.data.data;
  },

  getSections: async (batchId?: number): Promise<Section[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ACADEMIC.SECTIONS, { params: { batchId } });
    return response.data.data;
  },
};
