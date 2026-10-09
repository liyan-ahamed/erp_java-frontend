import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/api/audit.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { AuditLogQuery } from '@/types/audit';

export const useAuditLogs = (query: AuditLogQuery) => {
  return useQuery({
    queryKey: [QUERY_KEYS.AUDIT_LOGS, query],
    queryFn: () => auditService.getAuditLogs(query),
    placeholderData: keepPreviousData,
  });
};
