import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { holidayService } from '@/services/api/holiday.service';
import { toInstitutionCalendar } from '@/lib/holidays';
import { HolidayRequest } from '@/types/holiday';

/**
 * One year of the institution holiday calendar: the year's publication status plus its college holidays,
 * fetched together so the two never disagree. Shared by the Holidays tab, the attendance calendar and the
 * staff dashboard. Kept for 30 minutes and never polled; HOD changes invalidate it.
 */
export const useInstitutionHolidays = (year: number, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.HOLIDAYS, year],
    queryFn: async () => {
      const [info, rows] = await Promise.all([holidayService.getCalendar(year), holidayService.getHolidays({ year })]);
      return toInstitutionCalendar(info, rows);
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: false,
    enabled,
  });

// ---------- HOD management (the backend rejects these for other roles) ----------

const useHolidayMutation = <TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOLIDAYS] }),
  });
};

export const useSaveHoliday = () =>
  useHolidayMutation(({ id, payload }: { id?: number; payload: HolidayRequest }) =>
    id ? holidayService.updateHoliday(id, payload) : holidayService.createHoliday(payload));

export const useDeleteHoliday = () => useHolidayMutation((id: number) => holidayService.deleteHoliday(id));

export const usePublishCalendar = () =>
  useHolidayMutation(({ year, publish }: { year: number; publish: boolean }) =>
    publish ? holidayService.publish(year) : holidayService.unpublish(year));
