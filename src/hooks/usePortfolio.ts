import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { portfolioService } from '@/services/api/portfolio.service';
import { MyPortfolioQuery, PortfolioEntry, PortfolioEntryRequest, PortfolioReviewQuery } from '@/types/portfolio';

// Portfolio data changes only through explicit user actions, so these queries
// skip the shared client's background polling.
const NO_POLLING = { refetchInterval: false } as const;

// ---------- Student ----------

export const useMyPortfolio = (query: MyPortfolioQuery) =>
  useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_ME, query],
    queryFn: () => portfolioService.getMyPortfolio(query),
    placeholderData: keepPreviousData,
    ...NO_POLLING,
  });

export const useMyPortfolioSummary = () =>
  useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_ME_SUMMARY],
    queryFn: portfolioService.getMySummary,
    ...NO_POLLING,
  });

export const usePortfolioEntry = (id: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_ENTRY, id],
    queryFn: () => portfolioService.getEntry(id as number),
    enabled: id !== null,
    retry: false,
    ...NO_POLLING,
  });

/** After a student changes an entry: own list, own counts and that entry's detail. */
const useInvalidateOwn = () => {
  const queryClient = useQueryClient();
  return (id?: number) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PORTFOLIO_ME] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PORTFOLIO_ME_SUMMARY] });
    if (id !== undefined) queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PORTFOLIO_ENTRY, id] });
  };
};

export const useSavePortfolioEntry = () => {
  const invalidate = useInvalidateOwn();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: PortfolioEntryRequest }) =>
      id ? portfolioService.updateEntry(id, payload) : portfolioService.createEntry(payload),
    onSuccess: (entry) => invalidate(entry.id),
  });
};

export const useDeletePortfolioEntry = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateOwn();
  return useMutation({
    mutationFn: (id: number) => portfolioService.deleteEntry(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.PORTFOLIO_ENTRY, id] });
      invalidate();
    },
  });
};

export const useSubmitPortfolioEntry = () => {
  const invalidate = useInvalidateOwn();
  return useMutation({
    mutationFn: (id: number) => portfolioService.submitEntry(id),
    onSuccess: (entry) => invalidate(entry.id),
  });
};

// ---------- Reviewers ----------

export const usePortfolioReviewQueue = (query: PortfolioReviewQuery) =>
  useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_REVIEW, query],
    queryFn: () => portfolioService.getReviewQueue(query),
    placeholderData: keepPreviousData,
    ...NO_POLLING,
  });

/** After verify/reject: queue, that entry, the student's verified portfolio and the summary. */
const useInvalidateReviewed = () => {
  const queryClient = useQueryClient();
  return (entry: PortfolioEntry) => {
    queryClient.setQueryData([QUERY_KEYS.PORTFOLIO_ENTRY, entry.id], entry);
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PORTFOLIO_REVIEW] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PORTFOLIO_STUDENT, entry.studentId] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PORTFOLIO_SUMMARY] });
  };
};

export const useVerifyPortfolioEntry = () => {
  const invalidate = useInvalidateReviewed();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote?: string }) =>
      portfolioService.verifyEntry(id, reviewNote ? { reviewNote } : {}),
    onSuccess: invalidate,
  });
};

export const useRejectPortfolioEntry = () => {
  const invalidate = useInvalidateReviewed();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote: string }) =>
      portfolioService.rejectEntry(id, { reviewNote }),
    onSuccess: invalidate,
  });
};

export const useStudentPortfolio = (studentId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_STUDENT, studentId],
    queryFn: () => portfolioService.getStudentPortfolio(studentId as number),
    enabled: studentId !== null,
    retry: false,
    ...NO_POLLING,
  });

export const usePortfolioSummary = () =>
  useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_SUMMARY],
    queryFn: portfolioService.getSummary,
    ...NO_POLLING,
  });
