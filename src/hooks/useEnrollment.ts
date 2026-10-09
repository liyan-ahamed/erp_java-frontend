import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { enrollmentService } from '@/services/api/enrollment.service';
import { Enrollment, EnrollmentListQuery, EnrollmentStatus, EnrollStudentRequest } from '@/types/enrollment';

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
