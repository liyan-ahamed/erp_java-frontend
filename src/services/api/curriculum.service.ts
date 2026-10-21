import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { Curriculum, CurriculumRequest } from '@/types/curriculum';

/** Curriculum of one cohort + semester. HOD writes; HOD and STAFF read. */
export const curriculumService = {
  getCurriculum: async (batchId: number, semester: number): Promise<Curriculum> => {
    const response = await apiClient.get(API_ENDPOINTS.CURRICULA.BY_COHORT_SEMESTER(batchId, semester));
    return response.data.data;
  },

  /** Whole-document replace. A stale `version` → 409. */
  saveCurriculum: async (batchId: number, semester: number, payload: CurriculumRequest): Promise<Curriculum> => {
    const response = await apiClient.put(API_ENDPOINTS.CURRICULA.BY_COHORT_SEMESTER(batchId, semester), payload);
    return response.data.data;
  },

  /** Returns the cohort + semester to `configured: false`. */
  deleteCurriculum: async (batchId: number, semester: number): Promise<Curriculum> => {
    const response = await apiClient.delete(API_ENDPOINTS.CURRICULA.BY_COHORT_SEMESTER(batchId, semester));
    return response.data.data;
  },
};
