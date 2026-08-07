import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/api/notification.service';
import { NotificationFilters } from '@/types/notification';

const KEYS = {
  notifications: 'notifications',
  unreadCount: 'notificationsUnreadCount',
};

export const useNotifications = (filters: NotificationFilters = {}) => {
  return useQuery({
    queryKey: [KEYS.notifications, filters],
    queryFn: () => notificationService.getNotifications(filters),
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: [KEYS.unreadCount],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000, // Refresh every 30s
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEYS.notifications] });
      queryClient.invalidateQueries({ queryKey: [KEYS.unreadCount] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEYS.notifications] });
      queryClient.invalidateQueries({ queryKey: [KEYS.unreadCount] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEYS.notifications] });
      queryClient.invalidateQueries({ queryKey: [KEYS.unreadCount] });
    },
  });
};

export const useArchiveNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.archiveNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEYS.notifications] });
    },
  });
};
