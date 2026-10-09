import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { resultService } from '@/services/api/result.service';
import { BulkResultRequest, ResultListQuery } from '@/types/result';

const NO_POLLING = { refetchInterval: false } as const;

export const useResults = (query: ResultListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.RESULTS, query],
    queryFn: () => resultService.getResults(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useMyResults = () =>
  useQuery({ queryKey: [QUERY_KEYS.MY_RESULTS], queryFn: resultService.getMyResults, ...NO_POLLING });

export const useResultSheet = (offeringId: number | null, periodId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.RESULT_SHEET, offeringId, periodId],
    queryFn: () => resultService.getSheet(offeringId as number, periodId as number),
    enabled: offeringId !== null && periodId !== null,
    ...NO_POLLING,
  });

const useInvalidateSheet = () => {
  const queryClient = useQueryClient();
  return (offeringId: number, periodId: number) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RESULT_SHEET, offeringId, periodId] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RESULTS] });
  };
};

export const useSaveResults = () => {
  const invalidate = useInvalidateSheet();
  return useMutation({
    mutationFn: ({ offeringId, periodId, payload }: { offeringId: number; periodId: number; payload: BulkResultRequest }) =>
      resultService.saveSheet(offeringId, periodId, payload),
    onSuccess: (batch) => invalidate(batch.subjectOfferingId, batch.examPeriodId),
  });
};

export const usePublishResults = () => {
  const invalidate = useInvalidateSheet();
  return useMutation({
    mutationFn: ({ offeringId, periodId }: { offeringId: number; periodId: number }) =>
      resultService.publish(offeringId, periodId),
    onSuccess: (batch) => invalidate(batch.subjectOfferingId, batch.examPeriodId),
  });
};
