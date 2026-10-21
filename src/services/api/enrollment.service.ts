import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import {
  Enrollment,
  EnrollmentListQuery,
  EnrollmentStatus,
  EnrollStudentRequest,
  RegistrationStatusQuery,
  RegistrationSummary,
  SectionEnrollmentResult,
  StudentRegistrationDetail,
  StudentRegistrationRow,
} from '@/types/enrollment';

/** HOD manages; STAFF read their own offerings (backend-scoped); STUDENT reads /me. */
export const enrollmentService = {
  getEnrollments: async (query: EnrollmentListQuery): Promise<PaginatedResponse<Enrollment>> => {
    const response = await apiClient.get(API_ENDPOINTS.ENROLLMENTS.BASE, { params: query });
    return mapPage(response.data.data as BackendPage<Enrollment>);
  },

  getMyEnrollments: async (): Promise<Enrollment[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ENROLLMENTS.ME);
    return response.data.data;
  },

  getRoster: async (offeringId: number): Promise<Enrollment[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ENROLLMENTS.ROSTER(offeringId));
    return response.data.data;
  },

  enrollStudent: async (payload: EnrollStudentRequest): Promise<Enrollment> => {
    const response = await apiClient.post(API_ENDPOINTS.ENROLLMENTS.BASE, payload);
    return response.data.data;
  },

  enrollSection: async (offeringId: number): Promise<SectionEnrollmentResult> => {
    const response = await apiClient.post(API_ENDPOINTS.ENROLLMENTS.ENROLL_SECTION(offeringId));
    return response.data.data;
  },

  /** One row per student with the backend's registration status (HOD). Filters apply before paging. */
  getRegistrationStatus: async (query: RegistrationStatusQuery): Promise<PaginatedResponse<StudentRegistrationRow>> => {
    const response = await apiClient.get(API_ENDPOINTS.ENROLLMENTS.REGISTRATION_STATUS, { params: query });
    return mapPage(response.data.data as BackendPage<StudentRegistrationRow>);
  },

  getRegistrationSummary: async (query: Pick<RegistrationStatusQuery, 'batchId' | 'semester' | 'sectionId'>): Promise<RegistrationSummary> => {
    const response = await apiClient.get(API_ENDPOINTS.ENROLLMENTS.REGISTRATION_SUMMARY, { params: query });
    return response.data.data;
  },

  getRegistrationDetail: async (studentId: number, semester: number): Promise<StudentRegistrationDetail> => {
    const response = await apiClient.get(API_ENDPOINTS.ENROLLMENTS.REGISTRATION_DETAIL(studentId), { params: { semester } });
    return response.data.data;
  },

  changeStatus: async (id: number, status: EnrollmentStatus): Promise<Enrollment> => {
    const response = await apiClient.put(API_ENDPOINTS.ENROLLMENTS.STATUS(id), { status });
    return response.data.data;
  },
};
