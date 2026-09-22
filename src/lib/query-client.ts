import { QueryClient } from '@tanstack/react-query';

export const BACKGROUND_REFRESH_INTERVAL_MS = 7_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: BACKGROUND_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
