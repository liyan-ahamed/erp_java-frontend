import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '@/services/api/schedule.service';
import { CreateSchedulePayload, CreateStudentSchedulePayload, StudentScheduleType } from '@/types/schedule';

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

export const useStaffList = () => {
  return useQuery({
    queryKey: ['staffList'],
    queryFn: () => scheduleService.getStaff(),
  });
};

export const useSchedules = (type?: 'DEADLINE' | 'MEETING') => {
  return useQuery({
    queryKey: ['schedules', type],
    queryFn: () => scheduleService.getSchedules(type),
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateSchedulePayload) => scheduleService.createSchedule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => scheduleService.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};
