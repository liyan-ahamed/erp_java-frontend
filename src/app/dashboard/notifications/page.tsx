'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useDeleteNotification, useArchiveNotification } from '@/hooks/useNotifications';
import { NotificationFilters, NotificationCategory, NotificationPriority, Notification } from '@/types/notification';
import { categoryLabels, NOTIFICATION_CATEGORIES } from '@/data/notification-data';
import { Search, Bell, Check, CheckCheck, Trash2, Archive, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
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
    search: '',
    category: '',
    priority: '',
    status: '',
    sort: 'newest',
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
  const archiveNotification = useArchiveNotification();

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
      {/* Top: Search + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 w-full sm:max-w-xs">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search notifications..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 0 })}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value as NotificationCategory | '', page: 0 })}
            className="h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
          >
            <option value="">All Categories</option>
            {NOTIFICATION_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{categoryLabels[cat]}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value as NotificationPriority | '', page: 0 })}
            className="h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as 'read' | 'unread' | '', page: 0 })}
            className="h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
          >
            <option value="">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value as 'newest' | 'oldest' | 'priority' })}
            className="h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>

      {/* Bulk actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-xs font-medium text-[#666666] hover:text-[#111111] transition-colors"
          >
            <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
              data && selectedIds.size === data.content.length && data.content.length > 0
                ? 'bg-[#111111] border-[#111111]'
                : 'border-[#D4D4D4]'
            }`}>
              {data && selectedIds.size === data.content.length && data.content.length > 0 && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            Select All
          </button>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9A9A9A]">{selectedIds.size} selected</span>
              <Button variant="ghost" size="sm" onClick={bulkMarkRead} className="text-xs">
                <Check className="w-3.5 h-3.5 mr-1" /> Mark Read
              </Button>
              <Button variant="ghost" size="sm" onClick={bulkDelete} className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(unreadCount ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()} isLoading={markAllAsRead.isPending}>
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
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
          <p className="text-[#666666] font-medium text-sm">Loading notifications...</p>
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
            <div className="divide-y divide-[#F5F5F5]">
              {data?.content.map((notification) => {
                const pb = priorityBadge(notification.priority);
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 md:px-6 md:py-4 transition-colors cursor-pointer hover:bg-[#FAFAFA] ${
                      !notification.is_read ? 'bg-[#FAFBFC]' : ''
                    } ${detailNotification?.id === notification.id ? 'bg-[#F5F5F5]' : ''}`}
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
                          ? 'bg-[#111111] border-[#111111]'
                          : 'border-[#D4D4D4] hover:border-[#9A9A9A]'
                      }`}>
                        {selectedIds.has(notification.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>

                    {/* Unread indicator */}
                    <div className="mt-2 flex-shrink-0">
                      {!notification.is_read ? (
                        <div className="w-2 h-2 rounded-full bg-[#111111]" />
                      ) : (
                        <div className="w-2 h-2" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className={`text-sm font-semibold truncate ${!notification.is_read ? 'text-[#111111]' : 'text-[#666666]'}`}>
                          {notification.title}
                        </h4>
                        <Badge variant={pb.variant}>{pb.label}</Badge>
                        {notification.category && (
                          <Badge variant="outline">{categoryLabels[notification.category]}</Badge>
                        )}
                      </div>
                      <p className="text-[13px] text-[#666666] line-clamp-2 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-3 text-[11px] text-[#9A9A9A]">
                        {notification.user_name && <span>{notification.user_name}</span>}
                        <span>•</span>
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
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9A9A9A] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); archiveNotification.mutate(notification.id); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9A9A9A] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this notification?')) {
                            deleteNotification.mutate(notification.id);
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9A9A9A] hover:text-red-500 hover:bg-red-50 transition-colors"
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
                  <Bell className="w-10 h-10 text-[#D4D4D4] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#666666]">No notifications found</p>
                  <p className="text-xs text-[#9A9A9A] mt-1">Try adjusting your filters</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#F5F5F5]">
                <span className="text-xs text-[#9A9A9A]">
                  Showing {data.number * data.size + 1}–{Math.min((data.number + 1) * data.size, data.totalElements)} of {data.totalElements}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={data.number === 0}
                    onClick={() => setFilters({ ...filters, page: (filters.page || 0) - 1 })}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => (
                    <Button
                      key={i}
                      variant={i === data.number ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: i })}
                      className="w-8 h-8 p-0"
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={data.number >= data.totalPages - 1}
                    onClick={() => setFilters({ ...filters, page: (filters.page || 0) + 1 })}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Detail Drawer (side panel) */}
        {detailNotification && (
          <div className="hidden lg:block w-[380px] flex-shrink-0">
            <Card className="sticky top-4">
              <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111111]">Notification Details</h3>
                <button
                  onClick={() => setDetailNotification(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#9A9A9A] hover:text-[#111111] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardContent className="p-6 space-y-5">
                <div>
                  <h4 className="text-base font-semibold text-[#111111] mb-2">{detailNotification.title}</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={priorityBadge(detailNotification.priority).variant}>
                      {priorityBadge(detailNotification.priority).label}
                    </Badge>
                    {detailNotification.category && (
                      <Badge variant="outline">{categoryLabels[detailNotification.category]}</Badge>
                    )}
                    <Badge variant={detailNotification.is_read ? 'default' : 'info'}>
                      {detailNotification.is_read ? 'Read' : 'Unread'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Description</label>
                  <p className="text-[13px] text-[#666666] mt-1 leading-relaxed">{detailNotification.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Type</label>
                    <p className="text-sm text-[#111111] mt-1">{detailNotification.type}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Module</label>
                    <p className="text-sm text-[#111111] mt-1">{detailNotification.module}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">From</label>
                    <p className="text-sm text-[#111111] mt-1">{detailNotification.user_name || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Time</label>
                    <p className="text-sm text-[#111111] mt-1">{timeAgo(detailNotification.created_at)}</p>
                  </div>
                </div>

                {detailNotification.read_at && (
                  <div>
                    <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Read At</label>
                    <p className="text-sm text-[#111111] mt-1">
                      {new Date(detailNotification.read_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Created</label>
                  <p className="text-sm text-[#111111] mt-1">
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
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Mark Read
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
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
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
