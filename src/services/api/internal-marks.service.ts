import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { InternalMarks, StudentGradeQuery } from '@/types/gradebook';

// Read-only: totals are null until the backend has a calculation configured.
export const internalMarksService = {
  getForOffering: async (offeringId: number): Promise<InternalMarks> => {
    const response = await apiClient.get(API_ENDPOINTS.SUBJECT_OFFERINGS.INTERNAL_MARKS(offeringId));
    return response.data.data;
  },

  /** One entry per offering of the student's section, containing only that student. */
  getMine: async (query: StudentGradeQuery): Promise<InternalMarks[]> => {
    const response = await apiClient.get(API_ENDPOINTS.INTERNAL_MARKS.ME, { params: query });
    return response.data.data;
  },
};
