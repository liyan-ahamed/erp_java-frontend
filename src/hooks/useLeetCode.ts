import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leetcodeService } from '@/services/api/leetcode.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { LeetCodeYear } from '@/types/leetcode';

// LeetCode is only queried when the user clicks Fetch Data, so these queries
// opt out of any background refetching configured on the shared query client.
const NO_BACKGROUND_REFETCH = {
  refetchInterval: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export const useLeetCodeFilters = (enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.LEETCODE_FILTERS],
    queryFn: leetcodeService.getFilters,
    enabled,
    ...NO_BACKGROUND_REFETCH,
  });

/** Fetches one year/section from LeetCode (via the ERP backend) on demand. */
export const useFetchLeetCodeSection = () =>
  useMutation({
    mutationFn: ({ year, section }: { year: LeetCodeYear; section: string }) =>
      leetcodeService.fetchSectionStats(year, section),
  });

/** The logged-in student's stored profile; reads the ERP database only. */
export const useMyLeetCodeProfile = (enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.LEETCODE_ME],
    queryFn: leetcodeService.getMyProfile,
    enabled,
    ...NO_BACKGROUND_REFETCH,
  });

export const useFetchMyLeetCodeStats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leetcodeService.fetchMyStats,
    onSuccess: (data) => queryClient.setQueryData([QUERY_KEYS.LEETCODE_ME], data),
  });
};
