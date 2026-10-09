import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { examService } from '@/services/api/exam.service';
import { fetchAllPages } from '@/lib/pagination';
import { ExamPeriodListQuery, ExamPeriodRequest, ExamRegistrationListQuery } from '@/types/exam';

const NO_POLLING = { refetchInterval: false } as const;

// ---------- Exam periods (HOD manages, STAFF read) ----------

export const useExamPeriods = (query: ExamPeriodListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.EXAM_PERIODS, query],
    queryFn: () => examService.getPeriods(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

/** Every exam period, for dropdowns. */
export const useAllExamPeriods = (enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.EXAM_PERIODS, 'all'],
    queryFn: () => fetchAllPages((page, size) => examService.getPeriods({ page, size })),
    enabled,
    ...NO_POLLING,
  });

type PeriodAction =
  | { action: 'save'; id?: number; payload: ExamPeriodRequest }
  | { action: 'open' | 'close'; id: number };

export const useExamPeriodAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (a: PeriodAction) => {
      if (a.action === 'save') return a.id ? examService.updatePeriod(a.id, a.payload) : examService.createPeriod(a.payload);
      return a.action === 'open' ? examService.openPeriod(a.id) : examService.closePeriod(a.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXAM_PERIODS] }),
  });
};

// ---------- Registrations: student ----------

export const useMyOpenExamPeriods = () =>
  useQuery({ queryKey: [QUERY_KEYS.MY_EXAM_PERIODS], queryFn: examService.getMyOpenPeriods, ...NO_POLLING });

export const useEligibleSubjects = (periodId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.MY_ELIGIBLE_SUBJECTS, periodId],
    queryFn: () => examService.getEligibleSubjects(periodId as number),
    enabled: periodId !== null,
    ...NO_POLLING,
  });

export const useMyExamRegistrations = () =>
  useQuery({ queryKey: [QUERY_KEYS.MY_EXAM_REGISTRATION], queryFn: examService.getMyRegistrations, ...NO_POLLING });

export const useMyRegistrationAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (a: { action: 'save'; periodId: number; subjectOfferingIds: number[] } | { action: 'submit'; periodId: number }) =>
      a.action === 'save'
        ? examService.saveMyRegistration(a.periodId, { subjectOfferingIds: a.subjectOfferingIds })
        : examService.submitMyRegistration(a.periodId),
    onSuccess: (registration) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_EXAM_PERIODS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_ELIGIBLE_SUBJECTS, registration.examPeriodId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_EXAM_REGISTRATION] });
    },
  });
};

// ---------- Registrations: HOD review ----------

export const useExamRegistrations = (query: ExamRegistrationListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.EXAM_REGISTRATIONS, query],
    queryFn: () => examService.getRegistrations(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useReviewRegistration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reviewNote }: { id: number; decision: 'approve' | 'reject'; reviewNote: string | null }) =>
      decision === 'approve' ? examService.approve(id, { reviewNote }) : examService.reject(id, { reviewNote }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXAM_REGISTRATIONS] }),
  });
};
