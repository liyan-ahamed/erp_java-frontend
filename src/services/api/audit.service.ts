import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { AuditLog, AuditLogQuery } from '@/types/audit';
import { BackendPage, PaginatedResponse } from '@/types/api';

export const auditService = {
  getAuditLogs: async ({ page, size }: AuditLogQuery): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get(API_ENDPOINTS.AUDIT_LOGS.BASE, { params: { page, size } });
    return mapPage(response.data.data as BackendPage<AuditLog>);
  },
};
