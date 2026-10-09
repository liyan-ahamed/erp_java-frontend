export type NotificationPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export type NotificationType = 'INFO' | 'WARNING' | 'ACTION_REQUIRED' | 'SCHEDULE' | 'SYSTEM';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  module: string;
  reference_id: number | null;
  reference_type: string | null;
  priority: NotificationPriority;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/** Only read/unread filtering is supported by the backend. */
export interface NotificationFilters {
  status?: 'read' | 'unread' | '';
  page?: number;
  size?: number;
}
