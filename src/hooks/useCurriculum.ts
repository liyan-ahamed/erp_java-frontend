import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { curriculumService } from '@/services/api/curriculum.service';
import { Curriculum, CurriculumRequest } from '@/types/curriculum';

// Changes only through explicit saves, so no background polling.
const NO_POLLING = { refetchInterval: false } as const;

export const useCurriculum = (batchId: number | null, semester: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.CURRICULUM, batchId, semester],
    queryFn: () => curriculumService.getCurriculum(batchId as number, semester as number),
    enabled: batchId !== null && semester !== null,
    ...NO_POLLING,
  });

/** Saved curricula change every registration status of that cohort, so enrollment queries refresh too. */
const useCurriculumMutation = <TVars,>(mutationFn: (vars: TVars) => Promise<Curriculum>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (curriculum) => {
      queryClient.setQueryData([QUERY_KEYS.CURRICULUM, curriculum.batchId, curriculum.semester], curriculum);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENROLLMENTS] });
    },
  });
};

export const useSaveCurriculum = () =>
  useCurriculumMutation(({ batchId, semester, payload }: { batchId: number; semester: number; payload: CurriculumRequest }) =>
    curriculumService.saveCurriculum(batchId, semester, payload));

export const useDeleteCurriculum = () =>
  useCurriculumMutation(({ batchId, semester }: { batchId: number; semester: number }) =>
    curriculumService.deleteCurriculum(batchId, semester));
