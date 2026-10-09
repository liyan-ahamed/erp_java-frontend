import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '@/services/api/schedule.service';
import { CreateStudentSchedulePayload, StudentScheduleType } from '@/types/schedule';

export const useScheduleAudience = (enabled = true) => useQuery({
  queryKey: ['studentScheduleAudience'], queryFn: scheduleService.getAudience, enabled,
});

export const useStudentSchedules = (type: StudentScheduleType, enabled = true) => useQuery({
  queryKey: ['studentSchedules', type], queryFn: () => scheduleService.getStudentSchedules(type), enabled,
});

export const useCreateStudentSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStudentSchedulePayload) => scheduleService.createStudentSchedule(payload),
    onSuccess: (_data, payload) => queryClient.invalidateQueries({ queryKey: ['studentSchedules', payload.type] }),
  });
};

export const useSubmitPollResponse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionIndex }: { pollId: number; optionIndex: number }) =>
      scheduleService.submitPollResponse(pollId, optionIndex),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studentSchedules', 'POLL'] }),
  });
};
