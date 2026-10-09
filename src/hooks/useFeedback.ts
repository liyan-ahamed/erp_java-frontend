import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { feedbackService } from '@/services/api/feedback.service';
import { FeedbackFormListQuery, FeedbackFormRequest, FeedbackSubmission } from '@/types/feedback';

const NO_POLLING = { refetchInterval: false } as const;

// ---------- HOD ----------

export const useFeedbackForms = (query: FeedbackFormListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.FEEDBACK_FORMS, query],
    queryFn: () => feedbackService.getForms(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useFeedbackForm = (id: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.FEEDBACK_FORM, id],
    queryFn: () => feedbackService.getForm(id as number),
    enabled: id !== null,
    ...NO_POLLING,
  });

export const useFeedbackAnalytics = (id: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.FEEDBACK_SUMMARY, id],
    queryFn: () => feedbackService.getAnalytics(id as number),
    enabled: id !== null,
    ...NO_POLLING,
  });

export const useFeedbackResponses = (id: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.FEEDBACK_SUBMISSIONS, id],
    queryFn: () => feedbackService.getResponses(id as number),
    enabled: id !== null,
    ...NO_POLLING,
  });

type FormAction =
  | { action: 'save'; id?: number; payload: FeedbackFormRequest }
  | { action: 'open' | 'close'; id: number };

export const useFeedbackFormAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (a: FormAction) => {
      if (a.action === 'save') return a.id ? feedbackService.updateForm(a.id, a.payload) : feedbackService.createForm(a.payload);
      return a.action === 'open' ? feedbackService.openForm(a.id) : feedbackService.closeForm(a.id);
    },
    onSuccess: (form) => {
      queryClient.setQueryData([QUERY_KEYS.FEEDBACK_FORM, form.id], form);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEEDBACK_FORMS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEEDBACK_SUMMARY, form.id] });
    },
  });
};

// ---------- Student ----------

export const useMyFeedbackForms = () =>
  useQuery({ queryKey: [QUERY_KEYS.MY_FEEDBACK_FORMS], queryFn: feedbackService.getMyForms, ...NO_POLLING });

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FeedbackSubmission }) => feedbackService.submit(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_FEEDBACK_FORMS] }),
  });
};
