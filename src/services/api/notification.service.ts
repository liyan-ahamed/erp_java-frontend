import { Notification, NotificationFilters } from '@/types/notification';
import { BackendPage, PaginatedResponse } from '@/types/api';
import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';

export const notificationService = {
  getNotifications: async (filters: NotificationFilters = {}): Promise<PaginatedResponse<Notification>> => {
    const page = filters.page || 0;
    const size = filters.size || 10;
    const isRead = filters.status === 'read' ? true : filters.status === 'unread' ? false : undefined;
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.BASE, { params: { page, size, isRead } });
    return mapPage(response.data.data as BackendPage<Notification>);
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    return response.data.data.count;
  },

  markAsRead: async (id: number): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
  },

  deleteNotification: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
  },
};
