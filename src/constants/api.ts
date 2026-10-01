export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  USERS: '/users',
  NOTIFICATIONS: {
    BASE: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: number) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    DELETE: (id: number) => `/notifications/${id}`,
  },
  AUDIT_LOGS: {
    BASE: '/audit-logs',
  },
  LEETCODE: {
    FILTERS: '/leetcode/filters',
    STATS: '/leetcode/stats',
    ME: '/leetcode/me',
    ME_STATS: '/leetcode/me/stats',
    PROFILE_URLS: '/leetcode/profile-urls',
    TOP: '/leetcode/top',
  },
} as const;
