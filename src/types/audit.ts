export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  module: string;
  entity_type: string;
  entity_id: number | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  // Client-side enrichment for detail panel
  role?: string;
  status?: 'SUCCESS' | 'FAILED' | 'PENDING';
  description?: string;
  reason?: string;
  browser?: string;
  device?: string;
  location?: string;
}

export interface AuditLogFilters {
  search?: string;
  date_from?: string;
  date_to?: string;
  user?: string;
  module?: string;
  action?: string;
  status?: string;
  role?: string;
  page?: number;
  size?: number;
}

export interface AuditLogDetail extends AuditLog {
  before_value_parsed?: Record<string, unknown> | null;
  after_value_parsed?: Record<string, unknown> | null;
}
