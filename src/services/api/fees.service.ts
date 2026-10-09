import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import {
  AssignFeeRequest,
  AssignFeeResult,
  FeeAccountDetail,
  FeeAccountListQuery,
  FeeStructure,
  FeeStructureListQuery,
  FeeStructureRequest,
  FeeSummary,
  MyFees,
  Receipt,
  ReceiptListQuery,
  RecordPaymentRequest,
  StudentFeeAccount,
  WaiveFeeRequest,
} from '@/types/fees';

/**
 * Fees (HOD administers; STUDENT reads /fees/me; STAFF have no access) and receipts.
 * Payments are only recorded — there is no payment gateway.
 * Money is sent as a decimal string so no floating-point rounding happens in the browser.
 */
export const feesService = {
  getMyFees: async (): Promise<MyFees> => {
    const response = await apiClient.get(API_ENDPOINTS.FEES.ME);
    return response.data.data;
  },

  getStructures: async (query: FeeStructureListQuery): Promise<PaginatedResponse<FeeStructure>> => {
    const response = await apiClient.get(API_ENDPOINTS.FEES.STRUCTURES, { params: query });
    return mapPage(response.data.data as BackendPage<FeeStructure>);
  },

  createStructure: async (payload: FeeStructureRequest): Promise<FeeStructure> => {
    const response = await apiClient.post(API_ENDPOINTS.FEES.STRUCTURES, payload);
    return response.data.data;
  },

  updateStructure: async (id: number, payload: FeeStructureRequest): Promise<FeeStructure> => {
    const response = await apiClient.put(API_ENDPOINTS.FEES.STRUCTURE(id), payload);
    return response.data.data;
  },

  assignStructure: async (id: number, payload: AssignFeeRequest): Promise<AssignFeeResult> => {
    const response = await apiClient.post(API_ENDPOINTS.FEES.ASSIGN(id), payload);
    return response.data.data;
  },

  getAccounts: async (query: FeeAccountListQuery): Promise<PaginatedResponse<StudentFeeAccount>> => {
    const response = await apiClient.get(API_ENDPOINTS.FEES.ACCOUNTS, { params: query });
    return mapPage(response.data.data as BackendPage<StudentFeeAccount>);
  },

  getAccount: async (id: number): Promise<FeeAccountDetail> => {
    const response = await apiClient.get(API_ENDPOINTS.FEES.ACCOUNT(id));
    return response.data.data;
  },

  recordPayment: async (accountId: number, payload: RecordPaymentRequest): Promise<Receipt> => {
    const response = await apiClient.post(API_ENDPOINTS.FEES.PAYMENTS(accountId), payload);
    return response.data.data;
  },

  waive: async (accountId: number, payload: WaiveFeeRequest): Promise<StudentFeeAccount> => {
    const response = await apiClient.post(API_ENDPOINTS.FEES.WAIVE(accountId), payload);
    return response.data.data;
  },

  getSummary: async (): Promise<FeeSummary> => {
    const response = await apiClient.get(API_ENDPOINTS.FEES.SUMMARY);
    return response.data.data;
  },

  // ---------- Receipts ----------

  getMyReceipts: async (): Promise<Receipt[]> => {
    const response = await apiClient.get(API_ENDPOINTS.RECEIPTS.ME);
    return response.data.data;
  },

  /** HOD, or the owning STUDENT (403 otherwise). */
  getReceipt: async (id: number): Promise<Receipt> => {
    const response = await apiClient.get(API_ENDPOINTS.RECEIPTS.BY_ID(id));
    return response.data.data;
  },

  searchReceipts: async (query: ReceiptListQuery): Promise<PaginatedResponse<Receipt>> => {
    const response = await apiClient.get(API_ENDPOINTS.RECEIPTS.BASE, { params: query });
    return mapPage(response.data.data as BackendPage<Receipt>);
  },
};
