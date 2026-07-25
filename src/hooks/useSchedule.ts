import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '@/services/api/schedule.service';
import { CreateSchedulePayload } from '@/types/schedule';

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
