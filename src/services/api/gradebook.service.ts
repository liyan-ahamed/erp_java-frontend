import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import {
  AssessmentSummary,
  BulkGradeRequest,
  Gradebook,
  GradeBulkUpdateResult,
  StudentGradeQuery,
  StudentGradeView,
} from '@/types/gradebook';

export const gradebookService = {
  /** The whole class list, including students without a grade (NOT_GRADED). */
  getGradebook: async (assessmentId: number): Promise<Gradebook> => {
    const response = await apiClient.get(API_ENDPOINTS.ASSESSMENTS.GRADES(assessmentId));
    return response.data.data;
  },

  /** One request for all changed rows; the backend saves all or nothing. */
  saveGrades: async (assessmentId: number, payload: BulkGradeRequest): Promise<GradeBulkUpdateResult> => {
    const response = await apiClient.put(API_ENDPOINTS.ASSESSMENTS.GRADES(assessmentId), payload);
    return response.data.data;
  },

  getSummary: async (assessmentId: number): Promise<AssessmentSummary> => {
    const response = await apiClient.get(API_ENDPOINTS.ASSESSMENTS.SUMMARY(assessmentId));
    return response.data.data;
  },

  /** The logged-in student's grades for FINALIZED assessments (not paginated). */
  getMyGrades: async (query: StudentGradeQuery): Promise<StudentGradeView[]> => {
    const response = await apiClient.get(API_ENDPOINTS.GRADES.ME, { params: query });
    return response.data.data;
  },
};
