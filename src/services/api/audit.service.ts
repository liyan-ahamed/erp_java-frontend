import { AuditLog, AuditLogFilters } from '@/types/audit';
import { mockAuditLogs } from '@/data/audit-data';
import { PaginatedResponse } from '@/types/api';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const applyFilters = (logs: AuditLog[], filters: AuditLogFilters): AuditLog[] => {
  let result = [...logs];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(l =>
      l.username.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.module.toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q)
    );
  }

  if (filters.date_from) {
    const from = new Date(filters.date_from).getTime();
    result = result.filter(l => new Date(l.timestamp).getTime() >= from);
  }

  if (filters.date_to) {
    const to = new Date(filters.date_to).getTime() + 86400000; // Include the whole day
    result = result.filter(l => new Date(l.timestamp).getTime() <= to);
  }

  if (filters.user) {
    result = result.filter(l => l.username.toLowerCase().includes(filters.user!.toLowerCase()));
  }

  if (filters.module) {
    result = result.filter(l => l.module === filters.module);
  }

  if (filters.action) {
    result = result.filter(l => l.action === filters.action);
  }

  if (filters.status) {
    result = result.filter(l => l.status === filters.status);
  }

  if (filters.role) {
    result = result.filter(l => l.role === filters.role);
  }

  // Always sort by timestamp descending
  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return result;
};

export const auditService = {
  getAuditLogs: async (filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> => {
    await delay(400);
    const filtered = applyFilters(mockAuditLogs, filters);
    const page = filters.page || 0;
    const size = filters.size || 15;
    const start = page * size;
    const content = filtered.slice(start, start + size);

    return {
      content,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
      size,
      number: page,
    };
  },

  getAuditLogDetail: async (id: number): Promise<AuditLog | null> => {
    await delay(200);
    return mockAuditLogs.find(l => l.id === id) || null;
  },

  getTodayStats: async () => {
    await delay(200);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = mockAuditLogs.filter(l => l.timestamp.startsWith(todayStr));
    
    return {
      total_activities: todayLogs.length,
      failed_logins: todayLogs.filter(l => l.action === 'LOGIN' && l.status === 'FAILED').length,
      permission_changes: todayLogs.filter(l => l.action === 'PERMISSION_CHANGED' || l.action === 'ROLE_ASSIGNED').length,
      critical_events: todayLogs.filter(l => l.status === 'FAILED').length,
    };
  },
};
