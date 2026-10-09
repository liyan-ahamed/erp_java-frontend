/** One row from GET /audit-logs. Sensitive values arrive already redacted by the backend. */
export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: number | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  user_agent: string | null;
  /** Server local time, no timezone offset. */
  timestamp: string;
}

/** The audit endpoint supports paging only — no server-side search or filters. */
export interface AuditLogQuery {
  page: number;
  size: number;
}
