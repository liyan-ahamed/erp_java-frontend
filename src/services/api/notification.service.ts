import { Notification, NotificationFilters } from '@/types/notification';
import { PaginatedResponse } from '@/types/api';
import { apiClient } from '@/lib/axios';

// Mock-based service — structured for easy API replacement
// The existing Notification API now supplies persisted reminders and messages.

const applyFilters = (notifications: Notification[], filters: NotificationFilters): Notification[] => {
  let result = [...notifications];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      n.module.toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    result = result.filter(n => n.category === filters.category);
  }

  if (filters.priority) {
    result = result.filter(n => n.priority === filters.priority);
  }

  if (filters.status === 'read') {
    result = result.filter(n => n.is_read);
  } else if (filters.status === 'unread') {
    result = result.filter(n => !n.is_read);
  }

  if (filters.sort === 'oldest') {
    result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (filters.sort === 'priority') {
    const order = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    result.sort((a, b) => order[a.priority] - order[b.priority]);
  } else {
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return result;
};

const archivedIds = new Set<number>();

interface BackendPage {
  content: Notification[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
}

export const notificationService = {
  getNotifications: async (filters: NotificationFilters = {}): Promise<PaginatedResponse<Notification>> => {
    const page = filters.page || 0;
    const size = filters.size || 10;
    const isRead = filters.status === 'read' ? true : filters.status === 'unread' ? false : undefined;
    const response = await apiClient.get('/notifications', { params: { page, size, isRead } });
    const backend = response.data.data as BackendPage;
    const content = applyFilters(backend.content
      .filter(item => !archivedIds.has(item.id))
      .map(item => ({ ...item, category: item.reference_type === 'POLL' ? 'REMINDER' : item.category })), filters);

    return {
      content,
      totalElements: backend.total_elements,
      totalPages: backend.total_pages,
      size: backend.size,
      number: backend.page,
    };
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.data.count;
  },

  markAsRead: async (id: number): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },

  deleteNotification: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  archiveNotification: async (id: number): Promise<void> => {
    // The backend has no archive field; preserve the existing session-only behavior.
    archivedIds.add(id);
  },
};
