import { Notification, NotificationFilters } from '@/types/notification';
import { mockNotifications } from '@/data/notification-data';
import { PaginatedResponse } from '@/types/api';

// Mock-based service — structured for easy API replacement
// When backend endpoints are ready, replace mock calls with apiClient calls

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

// In-memory state for mutations
let notifications = [...mockNotifications];

export const notificationService = {
  getNotifications: async (filters: NotificationFilters = {}): Promise<PaginatedResponse<Notification>> => {
    await delay(300);
    const filtered = applyFilters(notifications.filter(n => !n.is_archived), filters);
    const page = filters.page || 0;
    const size = filters.size || 10;
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

  getUnreadCount: async (): Promise<number> => {
    await delay(100);
    return notifications.filter(n => !n.is_read && !n.is_archived).length;
  },

  markAsRead: async (id: number): Promise<void> => {
    await delay(200);
    const n = notifications.find(n => n.id === id);
    if (n) {
      n.is_read = true;
      n.read_at = new Date().toISOString();
    }
  },

  markAllAsRead: async (): Promise<void> => {
    await delay(300);
    notifications.forEach(n => {
      if (!n.is_read) {
        n.is_read = true;
        n.read_at = new Date().toISOString();
      }
    });
  },

  deleteNotification: async (id: number): Promise<void> => {
    await delay(200);
    notifications = notifications.filter(n => n.id !== id);
  },

  archiveNotification: async (id: number): Promise<void> => {
    await delay(200);
    const n = notifications.find(n => n.id === id);
    if (n) {
      n.is_archived = true;
    }
  },
};
