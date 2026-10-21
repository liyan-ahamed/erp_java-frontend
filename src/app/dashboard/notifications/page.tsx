'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '@/hooks/useNotifications';
import { NotificationFilters, NotificationPriority, Notification } from '@/types/notification';
import { Bell, Check, CheckCheck, Trash2, X } from '@/components/ui/icons';
import { useRouter } from 'next/navigation';

const priorityBadge = (priority: NotificationPriority) => {
  const map: Record<NotificationPriority, { variant: 'error' | 'warning' | 'info' | 'default'; label: string }> = {
    URGENT: { variant: 'error', label: 'Urgent' },
    HIGH: { variant: 'warning', label: 'High' },
    NORMAL: { variant: 'default', label: 'Normal' },
    LOW: { variant: 'default', label: 'Low' },
  };
  return map[priority];
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function NotificationsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<NotificationFilters>({
    status: '',
    page: 0,
    size: 10,
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailNotification, setDetailNotification] = useState<Notification | null>(null);

  const { data, isLoading } = useNotifications(filters);
  const { data: unreadCount } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (!data) return;
    if (selectedIds.size === data.content.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.content.map(n => n.id)));
    }
  };

  const bulkMarkRead = () => {
    selectedIds.forEach(id => markAsRead.mutate(id));
    setSelectedIds(new Set());
  };

  const bulkDelete = () => {
    if (window.confirm(`Delete ${selectedIds.size} notification(s)?`)) {
      selectedIds.forEach(id => deleteNotification.mutate(id));
      setSelectedIds(new Set());
    }
  };

  const filtersBar = (
    <div className="flex flex-col gap-4">
      {/* Read status is filtered by the backend across all notifications */}
      <div className="flex items-center gap-2">
        <select
          value={filters.status}
          onChange={(e) => {
            setFilters({ ...filters, status: e.target.value as 'read' | 'unread' | '', page: 0 });
            setSelectedIds(new Set());
          }}
          className="h-10 px-3 text-sm border border-line rounded-[10px] bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All Status</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {/* Bulk actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-xs font-medium text-muted hover:text-fg transition-colors"
          >
            <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
              data && selectedIds.size === data.content.length && data.content.length > 0
                ? 'bg-fg border-fg'
                : 'border-line-strong'
            }`}>
              {data && selectedIds.size === data.content.length && data.content.length > 0 && (
                <Check className="w-3 h-3 text-surface" />
              )}
            </div>
            Select All
          </button>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{selectedIds.size} selected</span>
              <Button variant="ghost" size="sm" onClick={bulkMarkRead} className="text-xs">
                <Check className="w-3.5 h-3.5" /> Mark Read
              </Button>
              <Button variant="ghost" size="sm" onClick={bulkDelete} className="text-xs text-danger hover:text-danger hover:bg-danger-soft">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(unreadCount ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()} isLoading={markAllAsRead.isPending}>
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Spinner size="lg" />
          <p className="text-muted font-medium text-sm">Loading notifications...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer contextArea={filtersBar} rawLayout={true}>
      <div className="flex gap-6">
        {/* Notification List */}
        <div className="flex-1 min-w-0">
          <Card>
            <div className="divide-y divide-line">
              {data?.content.map((notification) => {
                const pb = priorityBadge(notification.priority);
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 md:px-6 md:py-4 transition-colors cursor-pointer hover:bg-soft ${
                      !notification.is_read ? 'bg-soft' : ''
                    } ${detailNotification?.id === notification.id ? 'bg-soft' : ''}`}
                    onClick={() => {
                      setDetailNotification(notification);
                      if (!notification.is_read) markAsRead.mutate(notification.id);
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(notification.id); }}
                      className="mt-1 flex-shrink-0"
                    >
                      <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                        selectedIds.has(notification.id)
                          ? 'bg-fg border-fg'
                          : 'border-line-strong hover:border-line-strong'
                      }`}>
                        {selectedIds.has(notification.id) && <Check className="w-3 h-3 text-surface" />}
                      </div>
                    </button>

                    {/* Unread indicator */}
                    <div className="mt-2 flex-shrink-0">
                      {!notification.is_read ? (
                        <div className="w-2 h-2 rounded-full bg-fg" />
                      ) : (
                        <div className="w-2 h-2" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className={`text-sm font-[550] truncate ${!notification.is_read ? 'text-fg' : 'text-muted'}`}>
                          {notification.title}
                        </h4>
                        <Badge variant={pb.variant}>{pb.label}</Badge>
                      </div>
                      <p className="text-[13px] text-muted line-clamp-2 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted">
                        <span>{timeAgo(notification.created_at)}</span>
                        {notification.module && (
                          <>
                            <span>•</span>
                            <span>{notification.module}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead.mutate(notification.id); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-soft transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this notification?')) {
                            deleteNotification.mutate(notification.id);
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {data?.content.length === 0 && (
                <div className="p-12 text-center">
                  <Bell className="w-10 h-10 text-muted/60 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted">No notifications found</p>
                  {filters.status && <p className="text-xs text-muted mt-1">Try a different status filter</p>}
                </div>
              )}
            </div>

            {data && (
              <Pagination
                data={data}
                onPageChange={(page) => {
                  setFilters({ ...filters, page });
                  setSelectedIds(new Set());
                }}
              />
            )}
          </Card>
        </div>

        {/* Detail Drawer (side panel) */}
        {detailNotification && (
          <div className="hidden lg:block w-[380px] flex-shrink-0">
            <Card className="sticky top-4">
              <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                <h3 className="text-sm font-[550] text-fg">Notification Details</h3>
                <button
                  onClick={() => setDetailNotification(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-soft text-muted hover:text-fg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardContent className="p-6 space-y-5">
                <div>
                  <h4 className="text-base font-[550] text-fg mb-2">{detailNotification.title}</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={priorityBadge(detailNotification.priority).variant}>
                      {priorityBadge(detailNotification.priority).label}
                    </Badge>
                    <Badge variant={detailNotification.is_read ? 'default' : 'info'}>
                      {detailNotification.is_read ? 'Read' : 'Unread'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-[550] text-muted uppercase tracking-wider">Description</label>
                  <p className="text-[13px] text-muted mt-1 leading-relaxed">{detailNotification.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-[550] text-muted uppercase tracking-wider">Type</label>
                    <p className="text-sm text-fg mt-1">{detailNotification.type}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-[550] text-muted uppercase tracking-wider">Module</label>
                    <p className="text-sm text-fg mt-1">{detailNotification.module}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-[550] text-muted uppercase tracking-wider">Time</label>
                    <p className="text-sm text-fg mt-1">{timeAgo(detailNotification.created_at)}</p>
                  </div>
                </div>

                {detailNotification.read_at && (
                  <div>
                    <label className="text-[10px] font-[550] text-muted uppercase tracking-wider">Read At</label>
                    <p className="text-sm text-fg mt-1">
                      {new Date(detailNotification.read_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-[550] text-muted uppercase tracking-wider">Created</label>
                  <p className="text-sm text-fg mt-1">
                    {new Date(detailNotification.created_at).toLocaleString('en-IN', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  {detailNotification.reference_type === 'POLL' && detailNotification.reference_id && (
                    <Button size="sm" onClick={() => router.push(`/dashboard/schedule/poll#poll-${detailNotification.reference_id}`)}>
                      Open Poll
                    </Button>
                  )}
                  {!detailNotification.is_read && (
                    <Button variant="secondary" size="sm" onClick={() => markAsRead.mutate(detailNotification.id)} className="flex-1">
                      <Check className="w-3.5 h-3.5" /> Mark Read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Delete this notification?')) {
                        deleteNotification.mutate(detailNotification.id);
                        setDetailNotification(null);
                      }
                    }}
                    className="text-danger hover:text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
