import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { academicService } from '@/services/api/academic.service';

// Reference data: normal caching, no background polling.
const NO_POLLING = { refetchInterval: false } as const;

export const useBatches = (enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.BATCHES],
    queryFn: academicService.getBatches,
    enabled,
    ...NO_POLLING,
  });

/** Sections of one batch (`[SECTIONS, batchId]`), or of every active batch when batchId is null. */
export const useSections = (batchId: number | null, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.SECTIONS, batchId ?? 'all'],
    queryFn: () => academicService.getSections(batchId ?? undefined),
    enabled,
    ...NO_POLLING,
  });
