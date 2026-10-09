// /lesson-plans — camelCase fields.

export type LessonPlanStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';

export interface LessonPlan {
  id: number;
  subjectOfferingId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  sectionId: number;
  sectionName: string;
  staffId: number;
  staffName: string;
  unitNumber: number | null;
  topic: string;
  description: string | null;
  plannedDate: string;
  completedDate: string | null;
  status: LessonPlanStatus;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LessonPlanListQuery {
  page: number;
  size: number;
  subjectOfferingId?: number;
  sectionId?: number;
  subjectId?: number;
  staffId?: number;
  status?: LessonPlanStatus;
}

export interface CreateLessonPlanRequest {
  subjectOfferingId: number;
  unitNumber: number | null;
  topic: string;
  description: string | null;
  plannedDate: string;
  notes: string | null;
}

export type UpdateLessonPlanRequest = Omit<CreateLessonPlanRequest, 'subjectOfferingId'>;

/** completedDate defaults to today on the backend; notes replace the current notes. */
export interface CompleteLessonPlanRequest {
  completedDate: string | null;
  notes: string | null;
}

/**
 * GET /lesson-plans/subject-offerings/{id}/progress, calculated by the backend.
 * totalPlanned excludes cancelled topics; completionPercentage is null when nothing is planned.
 */
export interface LessonPlanSummary {
  subjectOfferingId: number;
  subjectCode: string;
  subjectName: string;
  totalPlanned: number;
  completed: number;
  remaining: number;
  cancelled: number;
  completionPercentage: number | null;
}
