import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { attendanceService } from '@/services/api/attendance.service';
import {
  AttendanceSession,
  AttendanceSessionListQuery,
  BulkAttendanceRequest,
  CreateAttendanceSessionRequest,
  UpdateAttendanceSessionRequest,
} from '@/types/attendance';

const NO_POLLING = { refetchInterval: false } as const;

export const useAttendanceSessions = (query: AttendanceSessionListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE_SESSIONS, query],
    queryFn: () => attendanceService.getSessions(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

/** The session plus its full roster (NOT_MARKED rows included). */
export const useAttendanceRecords = (sessionId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE_RECORDS, sessionId],
    queryFn: () => attendanceService.getRecords(sessionId as number),
    enabled: sessionId !== null,
    ...NO_POLLING,
  });

export const useClassAttendanceSummary = (offeringId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE_SUMMARY, offeringId],
    queryFn: () => attendanceService.getClassSummary(offeringId as number),
    enabled: offeringId !== null,
    ...NO_POLLING,
  });

export const useMyAttendance = () =>
  useQuery({
    queryKey: [QUERY_KEYS.MY_ATTENDANCE],
    queryFn: attendanceService.getMyAttendance,
    ...NO_POLLING,
  });

export const useSaveAttendanceSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      args: { id: number; payload: UpdateAttendanceSessionRequest } | { id?: undefined; payload: CreateAttendanceSessionRequest },
    ) =>
      args.id
        ? attendanceService.updateSession(args.id, args.payload)
        : attendanceService.createSession(args.payload as CreateAttendanceSessionRequest),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE_SESSIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE_RECORDS, session.id] });
    },
  });
};

export const useDeleteAttendanceSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => attendanceService.deleteSession(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE_SESSIONS] });
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.ATTENDANCE_RECORDS, id] });
    },
  });
};

export const useSaveAttendanceRecords = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: number; payload: BulkAttendanceRequest }) =>
      attendanceService.saveRecords(sessionId, payload),
    onSuccess: (result) => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE_RECORDS, result.sessionId] }),
  });
};

export const useFinalizeAttendanceSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (session: AttendanceSession) => attendanceService.finalizeSession(session.id),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE_SESSIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE_RECORDS, session.id] });
      // Only finalized sessions count towards the class summary.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE_SUMMARY, session.subjectOfferingId] });
    },
  });
};
