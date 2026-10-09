import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import {
  MyPortfolioQuery,
  MyPortfolioSummary,
  PortfolioEntry,
  PortfolioEntryRequest,
  PortfolioReviewQuery,
  PortfolioReviewRequest,
  PortfolioSummary,
  StudentPortfolioSummary,
} from '@/types/portfolio';

export const portfolioService = {
  // ---- Student ----

  getMyPortfolio: async (query: MyPortfolioQuery): Promise<PaginatedResponse<PortfolioEntry>> => {
    const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.ME, { params: query });
    return mapPage(response.data.data as BackendPage<PortfolioEntry>);
  },

  getMySummary: async (): Promise<MyPortfolioSummary> => {
    const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.ME_SUMMARY);
    return response.data.data;
  },

  getEntry: async (id: number): Promise<PortfolioEntry> => {
    const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.ENTRY(id));
    return response.data.data;
  },

  createEntry: async (payload: PortfolioEntryRequest): Promise<PortfolioEntry> => {
    const response = await apiClient.post(API_ENDPOINTS.PORTFOLIO.ENTRIES, payload);
    return response.data.data;
  },

  updateEntry: async (id: number, payload: PortfolioEntryRequest): Promise<PortfolioEntry> => {
    const response = await apiClient.put(API_ENDPOINTS.PORTFOLIO.ENTRY(id), payload);
    return response.data.data;
  },

  deleteEntry: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.PORTFOLIO.ENTRY(id));
  },

  submitEntry: async (id: number): Promise<PortfolioEntry> => {
    const response = await apiClient.post(API_ENDPOINTS.PORTFOLIO.SUBMIT(id));
    return response.data.data;
  },

  // ---- Reviewers (STAFF / HOD) ----

  getReviewQueue: async (query: PortfolioReviewQuery): Promise<PaginatedResponse<PortfolioEntry>> => {
    const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.REVIEW, {
      params: { ...query, search: query.search || undefined },
    });
    return mapPage(response.data.data as BackendPage<PortfolioEntry>);
  },

  verifyEntry: async (id: number, payload: PortfolioReviewRequest): Promise<PortfolioEntry> => {
    const response = await apiClient.post(API_ENDPOINTS.PORTFOLIO.VERIFY(id), payload);
    return response.data.data;
  },

  rejectEntry: async (id: number, payload: Required<PortfolioReviewRequest>): Promise<PortfolioEntry> => {
    const response = await apiClient.post(API_ENDPOINTS.PORTFOLIO.REJECT(id), payload);
    return response.data.data;
  },

  getStudentPortfolio: async (studentId: number): Promise<StudentPortfolioSummary> => {
    const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.STUDENT(studentId));
    return response.data.data;
  },

  getSummary: async (): Promise<PortfolioSummary> => {
    const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.SUMMARY);
    return response.data.data;
  },
};
