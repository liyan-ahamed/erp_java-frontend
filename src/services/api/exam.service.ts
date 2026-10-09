import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import {
  EligibleSubject,
  ExamPeriod,
  ExamPeriodListQuery,
  ExamPeriodRequest,
  ExamRegistration,
  ExamRegistrationListQuery,
  ReviewRegistrationRequest,
  SaveRegistrationRequest,
  StudentExamPeriod,
} from '@/types/exam';

/** Exam periods (HOD manages, STAFF read) and registrations (STUDENT own, HOD reviews; no STAFF access). */
export const examService = {
  getPeriods: async (query: ExamPeriodListQuery): Promise<PaginatedResponse<ExamPeriod>> => {
    const response = await apiClient.get(API_ENDPOINTS.EXAM_PERIODS.BASE, { params: query });
    return mapPage(response.data.data as BackendPage<ExamPeriod>);
  },

  createPeriod: async (payload: ExamPeriodRequest): Promise<ExamPeriod> => {
    const response = await apiClient.post(API_ENDPOINTS.EXAM_PERIODS.BASE, payload);
    return response.data.data;
  },

  updatePeriod: async (id: number, payload: ExamPeriodRequest): Promise<ExamPeriod> => {
    const response = await apiClient.put(API_ENDPOINTS.EXAM_PERIODS.BY_ID(id), payload);
    return response.data.data;
  },

  openPeriod: async (id: number): Promise<ExamPeriod> => {
    const response = await apiClient.post(API_ENDPOINTS.EXAM_PERIODS.OPEN(id));
    return response.data.data;
  },

  closePeriod: async (id: number): Promise<ExamPeriod> => {
    const response = await apiClient.post(API_ENDPOINTS.EXAM_PERIODS.CLOSE(id));
    return response.data.data;
  },

  // ---------- Registrations ----------

  getMyOpenPeriods: async (): Promise<StudentExamPeriod[]> => {
    const response = await apiClient.get(API_ENDPOINTS.EXAM_REGISTRATIONS.OPEN_PERIODS);
    return response.data.data;
  },

  getEligibleSubjects: async (periodId: number): Promise<EligibleSubject[]> => {
    const response = await apiClient.get(API_ENDPOINTS.EXAM_REGISTRATIONS.ELIGIBLE(periodId));
    return response.data.data;
  },

  saveMyRegistration: async (periodId: number, payload: SaveRegistrationRequest): Promise<ExamRegistration> => {
    const response = await apiClient.put(API_ENDPOINTS.EXAM_REGISTRATIONS.SAVE_MINE(periodId), payload);
    return response.data.data;
  },

  submitMyRegistration: async (periodId: number): Promise<ExamRegistration> => {
    const response = await apiClient.post(API_ENDPOINTS.EXAM_REGISTRATIONS.SUBMIT_MINE(periodId));
    return response.data.data;
  },

  getMyRegistrations: async (): Promise<ExamRegistration[]> => {
    const response = await apiClient.get(API_ENDPOINTS.EXAM_REGISTRATIONS.ME);
    return response.data.data;
  },

  getRegistrations: async (query: ExamRegistrationListQuery): Promise<PaginatedResponse<ExamRegistration>> => {
    const response = await apiClient.get(API_ENDPOINTS.EXAM_REGISTRATIONS.BASE, { params: query });
    return mapPage(response.data.data as BackendPage<ExamRegistration>);
  },

  approve: async (id: number, payload: ReviewRegistrationRequest): Promise<ExamRegistration> => {
    const response = await apiClient.post(API_ENDPOINTS.EXAM_REGISTRATIONS.APPROVE(id), payload);
    return response.data.data;
  },

  reject: async (id: number, payload: ReviewRegistrationRequest): Promise<ExamRegistration> => {
    const response = await apiClient.post(API_ENDPOINTS.EXAM_REGISTRATIONS.REJECT(id), payload);
    return response.data.data;
  },
};
