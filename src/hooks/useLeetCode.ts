import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leetcodeService } from '@/services/api/leetcode.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { LeetCodeUrlUpdate, LeetCodeYear } from '@/types/leetcode';

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
export const useFetchLeetCodeSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, section }: { year: LeetCodeYear; section: string }) =>
      leetcodeService.fetchSectionStats(year, section),
    // Fresh statistics can change the year's ranking.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEETCODE_TOP] }),
  });
};

/**
 * The year's top solvers, 10 per request. Loads nothing until a year is given;
 * fetchNextPage brings the next 10.
 */
export const useLeetCodeTop = (year: LeetCodeYear | null) =>
  useInfiniteQuery({
    queryKey: [QUERY_KEYS.LEETCODE_TOP, year],
    queryFn: ({ pageParam }) => leetcodeService.getTopByYear(year as LeetCodeYear, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: year !== null,
    ...NO_BACKGROUND_REFETCH,
  });

/** Saves edited LeetCode profile URLs for one year/section. */
export const useUpdateLeetCodeUrls = () =>
  useMutation({
    mutationFn: ({ year, section, students }: { year: LeetCodeYear; section: string; students: LeetCodeUrlUpdate[] }) =>
      leetcodeService.updateProfileUrls(year, section, students),
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
