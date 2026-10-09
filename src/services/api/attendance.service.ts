import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import {
  AttendanceSession,
  AttendanceSessionListQuery,
  BulkAttendanceRequest,
  BulkAttendanceResult,
  ClassAttendanceSummary,
  CreateAttendanceSessionRequest,
  SessionRecords,
  SubjectAttendance,
  UpdateAttendanceSessionRequest,
} from '@/types/attendance';

/** Academic attendance. STAFF manage their own sessions; HOD reads; STUDENT reads /me. */
export const attendanceService = {
  getSessions: async (query: AttendanceSessionListQuery): Promise<PaginatedResponse<AttendanceSession>> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.SESSIONS, { params: query });
    return mapPage(response.data.data as BackendPage<AttendanceSession>);
  },

  createSession: async (payload: CreateAttendanceSessionRequest): Promise<AttendanceSession> => {
    const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.SESSIONS, payload);
    return response.data.data;
  },

  updateSession: async (id: number, payload: UpdateAttendanceSessionRequest): Promise<AttendanceSession> => {
    const response = await apiClient.put(API_ENDPOINTS.ATTENDANCE.SESSION(id), payload);
    return response.data.data;
  },

  deleteSession: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.ATTENDANCE.SESSION(id));
  },

  getRecords: async (id: number): Promise<SessionRecords> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.RECORDS(id));
    return response.data.data;
  },

  /** All rows are validated first; one bad row rejects the whole request. */
  saveRecords: async (id: number, payload: BulkAttendanceRequest): Promise<BulkAttendanceResult> => {
    const response = await apiClient.put(API_ENDPOINTS.ATTENDANCE.RECORDS(id), payload);
    return response.data.data;
  },

  finalizeSession: async (id: number): Promise<AttendanceSession> => {
    const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.FINALIZE(id));
    return response.data.data;
  },

  getClassSummary: async (offeringId: number): Promise<ClassAttendanceSummary> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.CLASS_SUMMARY(offeringId));
    return response.data.data;
  },

  getMyAttendance: async (): Promise<SubjectAttendance[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.ME);
    return response.data.data;
  },
};
