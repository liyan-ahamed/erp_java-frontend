export type NotificationCategory = 
  | 'SYSTEM'
  | 'ATTENDANCE'
  | 'LEAVE'
  | 'PAYROLL'
  | 'USER_MANAGEMENT'
  | 'SECURITY'
  | 'APPROVAL'
  | 'REMINDER';

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
  // Client-side enrichment
  category?: NotificationCategory;
  user_name?: string;
  is_archived?: boolean;
}

export interface NotificationFilters {
  search?: string;
  category?: NotificationCategory | '';
  priority?: NotificationPriority | '';
  status?: 'read' | 'unread' | '';
  sort?: 'newest' | 'oldest' | 'priority';
  page?: number;
  size?: number;
}
