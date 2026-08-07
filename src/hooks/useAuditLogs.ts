import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/api/audit.service';
import { AuditLogFilters } from '@/types/audit';

const KEYS = {
  auditLogs: 'auditLogs',
  auditLogDetail: 'auditLogDetail',
  auditStats: 'auditStats',
};

export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  return useQuery({
    queryKey: [KEYS.auditLogs, filters],
    queryFn: () => auditService.getAuditLogs(filters),
  });
};

export const useAuditLogDetail = (id: number | null) => {
  return useQuery({
    queryKey: [KEYS.auditLogDetail, id],
    queryFn: () => auditService.getAuditLogDetail(id!),
    enabled: id !== null,
  });
};

export const useAuditStats = () => {
  return useQuery({
    queryKey: [KEYS.auditStats],
    queryFn: () => auditService.getTodayStats(),
  });
};
