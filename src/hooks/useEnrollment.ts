import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { enrollmentService } from '@/services/api/enrollment.service';
import { fetchAllPages } from '@/lib/pagination';
import { Enrollment, EnrollmentListQuery, EnrollmentStatus, EnrollStudentRequest, RegistrationStatusQuery } from '@/types/enrollment';

// Enrollment data changes only through explicit actions, so no background polling.
const NO_POLLING = { refetchInterval: false } as const;

export const useEnrollments = (query: EnrollmentListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.ENROLLMENTS, query],
    queryFn: () => enrollmentService.getEnrollments(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useMyEnrollments = () =>
  useQuery({
    queryKey: [QUERY_KEYS.MY_ENROLLMENTS],
    queryFn: enrollmentService.getMyEnrollments,
    ...NO_POLLING,
  });

export const useEnrollmentRoster = (offeringId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.ENROLLMENT_ROSTER, offeringId],
    queryFn: () => enrollmentService.getRoster(offeringId as number),
    enabled: offeringId !== null,
    ...NO_POLLING,
  });

const useInvalidateEnrollments = () => {
  const queryClient = useQueryClient();
  return (offeringId: number) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENROLLMENTS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENROLLMENT_ROSTER, offeringId] });
  };
};

export const useEnrollStudent = () => {
  const invalidate = useInvalidateEnrollments();
  return useMutation({
    mutationFn: (payload: EnrollStudentRequest) => enrollmentService.enrollStudent(payload),
    onSuccess: (enrollment) => invalidate(enrollment.subjectOfferingId),
  });
};

export const useEnrollSection = () => {
  const invalidate = useInvalidateEnrollments();
  return useMutation({
    mutationFn: (offeringId: number) => enrollmentService.enrollSection(offeringId),
    onSuccess: (result) => invalidate(result.subjectOfferingId),
  });
};

export const useChangeEnrollmentStatus = () => {
  const invalidate = useInvalidateEnrollments();
  return useMutation({
    mutationFn: ({ enrollment, status }: { enrollment: Enrollment; status: EnrollmentStatus }) =>
      enrollmentService.changeStatus(enrollment.id, status),
    onSuccess: (enrollment) => invalidate(enrollment.subjectOfferingId),
  });
};

// ---------- Registration status (contract C) ----------
// Keyed under ENROLLMENTS so every enrollment change (enroll, drop, reactivate…) refreshes them too.

export const useRegistrationStatus = (query: RegistrationStatusQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.ENROLLMENTS, 'registration-status', query],
    queryFn: () => enrollmentService.getRegistrationStatus(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useRegistrationSummary = (query: Pick<RegistrationStatusQuery, 'batchId' | 'semester' | 'sectionId'>, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.ENROLLMENTS, 'registration-summary', query],
    queryFn: () => enrollmentService.getRegistrationSummary(query),
    enabled,
    ...NO_POLLING,
  });

export const useRegistrationDetail = (studentId: number | null, semester: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.ENROLLMENTS, 'registration-detail', studentId, semester],
    queryFn: () => enrollmentService.getRegistrationDetail(studentId as number, semester as number),
    enabled: studentId !== null && semester !== null,
    ...NO_POLLING,
  });

/** Every enrollment row of one student (all pages) — the full records the status actions need. */
export const useStudentEnrollments = (studentId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.ENROLLMENTS, 'student', studentId],
    queryFn: () => fetchAllPages((page) => enrollmentService.getEnrollments({ page, size: 200, studentId: studentId as number })),
    enabled: studentId !== null,
    ...NO_POLLING,
  });
