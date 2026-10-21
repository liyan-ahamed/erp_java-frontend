// /curricula — contract section B (docs/ERP_API_CONTRACT.md). One curriculum per cohort (batch) + semester.

import { SubjectType } from '@/types/gradebook';

export interface CurriculumSubject {
  subjectId: number;
  code: string;
  name: string;
  subjectType: SubjectType | null;
  credits: number | null;
}

export interface CurriculumElectiveGroup {
  id: number;
  name: string;
  requiredSelections: number;
  /** 1-based position in the last saved request. */
  displayOrder: number;
  options: CurriculumSubject[];
}

/** GET/PUT/DELETE response. `configured: false` = nothing saved (lists empty, version null). */
export interface Curriculum {
  batchId: number;
  batchName: string;
  semester: number;
  configured: boolean;
  version: number | null;
  updatedAt: string | null;
  updatedBy: string | null;
  compulsorySubjects: CurriculumSubject[];
  electiveGroups: CurriculumElectiveGroup[];
}

/** PUT body: a whole-document replace. `version` null only when creating; group `id` null for a new group. */
export interface CurriculumRequest {
  version: number | null;
  compulsorySubjectIds: number[];
  electiveGroups: { id: number | null; name: string; requiredSelections: number; subjectIds: number[] }[];
}
