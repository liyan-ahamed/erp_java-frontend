import axios from 'axios';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { fetchAllPages } from '@/lib/pagination';
import { subjectService } from '@/services/api/subject.service';
import { subjectOfferingService } from '@/services/api/subject-offering.service';
import { assessmentService } from '@/services/api/assessment.service';
import { gradebookService } from '@/services/api/gradebook.service';
import { internalMarksService } from '@/services/api/internal-marks.service';
import { userService } from '@/services/api/user.service';
import {
  AssessmentListQuery,
  BulkGradeRequest,
  CreateAssessmentRequest,
  StudentGradeQuery,
  SubjectListQuery,
  SubjectOfferingListQuery,
  SubjectOfferingRequest,
  SubjectRequest,
  UpdateAssessmentRequest,
} from '@/types/gradebook';

// Gradebook data changes only through explicit user actions, so these queries
// skip the shared client's background polling. A 404 means the backend's gradebook
// flag is off (or the record is gone), so it is not retried.
const NO_POLLING = {
  refetchInterval: false,
  retry: (failureCount: number, error: unknown) =>
    !(axios.isAxiosError(error) && error.response?.status === 404) && failureCount < 1,
} as const;

// ---------- Subjects ----------

export const useSubjects = (query: SubjectListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.SUBJECTS, query],
    queryFn: () => subjectService.getSubjects(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

/** Every subject, for dropdowns. */
export const useAllSubjects = (enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.SUBJECTS, 'all'],
    queryFn: () => fetchAllPages((page, size) => subjectService.getSubjects({ page, size })),
    enabled,
    ...NO_POLLING,
  });

export const useSaveSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: SubjectRequest }) =>
      id ? subjectService.updateSubject(id, payload) : subjectService.createSubject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUBJECTS] });
      // Offerings embed the subject code/name.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUBJECT_OFFERINGS] });
    },
  });
};

// ---------- Subject offerings ----------

export const useSubjectOfferings = (query: SubjectOfferingListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.SUBJECT_OFFERINGS, query],
    queryFn: () => subjectOfferingService.getOfferings(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

/** Every offering visible to the user (STAFF: own only), for dropdowns. */
export const useAllSubjectOfferings = (enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.SUBJECT_OFFERINGS, 'all'],
    queryFn: () => fetchAllPages((page, size) => subjectOfferingService.getOfferings({ page, size })),
    enabled,
    ...NO_POLLING,
  });

export const useSubjectOffering = (id: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.SUBJECT_OFFERING_DETAIL, id],
    queryFn: () => subjectOfferingService.getOffering(id as number),
    enabled: id !== null,
    ...NO_POLLING,
  });

export const useSaveSubjectOffering = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: SubjectOfferingRequest }) =>
      id ? subjectOfferingService.updateOffering(id, payload) : subjectOfferingService.createOffering(payload),
    onSuccess: (offering) => {
      queryClient.setQueryData([QUERY_KEYS.SUBJECT_OFFERING_DETAIL, offering.id], offering);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUBJECT_OFFERINGS] });
      // Assessments and internal marks embed offering details (e.g. staff name).
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INTERNAL_MARKS, offering.id] });
    },
  });
};

/** Active STAFF users (not students), matching the backend's rule for offering staff. */
export const useStaffOptions = (enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.STAFF_OPTIONS],
    queryFn: async () => {
      const users = await fetchAllPages((page, size) => userService.getUsers({ page, size, active: true }));
      return users.filter((u) => u.roles.includes('ROLE_STAFF') && !u.roles.includes('ROLE_STUDENT'));
    },
    enabled,
    ...NO_POLLING,
  });

// ---------- Assessments ----------

export const useAssessments = (query: AssessmentListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.ASSESSMENTS, query],
    queryFn: () => assessmentService.getAssessments(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssessmentRequest) => assessmentService.createAssessment(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENTS] }),
  });
};

export const useUpdateAssessment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAssessmentRequest }) =>
      assessmentService.updateAssessment(id, payload),
    onSuccess: (assessment) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENTS] });
      // The gradebook embeds the assessment; max/pass marks feed the summary.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENT_GRADES, assessment.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENT_SUMMARY, assessment.id] });
    },
  });
};

export const useDeleteAssessment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => assessmentService.deleteAssessment(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENTS] });
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.ASSESSMENT_GRADES, id] });
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.ASSESSMENT_SUMMARY, id] });
    },
  });
};

export const useFinalizeAssessment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => assessmentService.finalizeAssessment(id),
    onSuccess: (assessment) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENT_GRADES, assessment.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENT_SUMMARY, assessment.id] });
      // Finalized assessments now appear in the offering's internal-marks sources.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INTERNAL_MARKS, assessment.subjectOfferingId] });
    },
  });
};

// ---------- Grades ----------

export const useGradebook = (assessmentId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.ASSESSMENT_GRADES, assessmentId],
    queryFn: () => gradebookService.getGradebook(assessmentId as number),
    enabled: assessmentId !== null,
    ...NO_POLLING,
  });

export const useAssessmentSummary = (assessmentId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.ASSESSMENT_SUMMARY, assessmentId],
    queryFn: () => gradebookService.getSummary(assessmentId as number),
    enabled: assessmentId !== null,
    ...NO_POLLING,
  });

export const useSaveGrades = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assessmentId, payload }: { assessmentId: number; payload: BulkGradeRequest }) =>
      gradebookService.saveGrades(assessmentId, payload),
    onSuccess: (_result, { assessmentId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENT_GRADES, assessmentId] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENT_SUMMARY, assessmentId] }),
      ]),
  });
};

export const useMyGrades = (query: StudentGradeQuery) =>
  useQuery({
    queryKey: [QUERY_KEYS.MY_GRADES, query],
    queryFn: () => gradebookService.getMyGrades(query),
    placeholderData: keepPreviousData,
    ...NO_POLLING,
  });

// ---------- Internal marks ----------

export const useOfferingInternalMarks = (offeringId: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.INTERNAL_MARKS, offeringId],
    queryFn: () => internalMarksService.getForOffering(offeringId as number),
    enabled: offeringId !== null,
    ...NO_POLLING,
  });

export const useMyInternalMarks = (query: StudentGradeQuery) =>
  useQuery({
    queryKey: [QUERY_KEYS.MY_INTERNAL_MARKS, query],
    queryFn: () => internalMarksService.getMine(query),
    placeholderData: keepPreviousData,
    ...NO_POLLING,
  });
