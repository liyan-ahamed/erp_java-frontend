import { useMemo } from 'react';
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

/**
 * The backend's active cohorts that appear in `rows` — for academic filters on data pages, so only
 * cohorts with records are offered. Undefined until /batches loads (filters then derive cohorts from rows).
 * Not for students: they can't call /batches.
 */
export const useCohortsIn = (rows: { batchId: number }[] | undefined, enabled = true) => {
  const batches = useBatches(enabled);
  return useMemo(
    () => (batches.data && rows ? batches.data.filter((b) => rows.some((r) => r.batchId === b.id)) : undefined),
    [batches.data, rows],
  );
};
