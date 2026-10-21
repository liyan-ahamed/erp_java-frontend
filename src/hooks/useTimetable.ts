import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { timetableService } from '@/services/api/timetable.service';
import { scheduleFromPeriods } from '@/lib/academic-periods';
import { TimetableListQuery, TimetableSlotRequest } from '@/types/timetable';

const NO_POLLING = { refetchInterval: false } as const;

export const useTimetableSlots = (query: TimetableListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.TIMETABLE, query],
    queryFn: () => timetableService.getSlots(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

/**
 * The institution's daily period schedule from the backend. It never changes during a session, so it is
 * fetched once and kept. `data` is already converted to schedule rows (see lib/academic-periods).
 */
export const usePeriodSchedule = () =>
  useQuery({
    queryKey: [QUERY_KEYS.PERIOD_SCHEDULE],
    queryFn: async () => scheduleFromPeriods(await timetableService.getPeriods()),
    staleTime: Infinity,
    ...NO_POLLING,
  });

export const useMyTimetable = (enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.MY_TIMETABLE],
    queryFn: timetableService.getMyTimetable,
    enabled,
    ...NO_POLLING,
  });

const useInvalidateTimetable = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMETABLE] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_TIMETABLE] });
  };
};

export const useSaveTimetableSlot = () => {
  const invalidate = useInvalidateTimetable();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: TimetableSlotRequest }) =>
      id ? timetableService.updateSlot(id, payload) : timetableService.createSlot(payload),
    onSuccess: invalidate,
  });
};

export const useDeleteTimetableSlot = () => {
  const invalidate = useInvalidateTimetable();
  return useMutation({
    mutationFn: (id: number) => timetableService.deleteSlot(id),
    onSuccess: invalidate,
  });
};
