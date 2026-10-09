import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { lessonPlanService } from '@/services/api/lesson-plan.service';
import {
  CompleteLessonPlanRequest,
  CreateLessonPlanRequest,
  LessonPlan,
  LessonPlanListQuery,
  UpdateLessonPlanRequest,
} from '@/types/lesson-plan';

const NO_POLLING = { refetchInterval: false } as const;

export const useLessonPlans = (query: LessonPlanListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.LESSON_PLANS, query],
    queryFn: () => lessonPlanService.getPlans(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useMyLessonPlans = () =>
  useQuery({
    queryKey: [QUERY_KEYS.MY_LESSON_PLANS],
    queryFn: lessonPlanService.getMyPlans,
    ...NO_POLLING,
  });

export const useLessonPlanProgress = (offeringId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.LESSON_PLAN_SUMMARY, offeringId],
    queryFn: () => lessonPlanService.getProgress(offeringId as number),
    enabled: offeringId !== null,
    ...NO_POLLING,
  });

type LessonPlanAction =
  | { action: 'create'; payload: CreateLessonPlanRequest }
  | { action: 'update'; id: number; payload: UpdateLessonPlanRequest }
  | { action: 'complete'; id: number; payload: CompleteLessonPlanRequest }
  | { action: 'cancel'; id: number }
  | { action: 'reopen'; id: number };

const run = (a: LessonPlanAction): Promise<LessonPlan> => {
  switch (a.action) {
    case 'create': return lessonPlanService.createPlan(a.payload);
    case 'update': return lessonPlanService.updatePlan(a.id, a.payload);
    case 'complete': return lessonPlanService.completePlan(a.id, a.payload);
    case 'cancel': return lessonPlanService.cancelPlan(a.id);
    case 'reopen': return lessonPlanService.reopenPlan(a.id);
  }
};

/** Every lesson-plan write; refreshes the list and that offering's progress only. */
export const useLessonPlanAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LESSON_PLANS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LESSON_PLAN_SUMMARY, plan.subjectOfferingId] });
    },
  });
};
