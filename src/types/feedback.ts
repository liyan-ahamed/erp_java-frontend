// /feedback — camelCase fields. Responses never carry student identity for anonymous forms.

export type FeedbackQuestionType = 'RATING' | 'TEXT';

/** Who a form is for. DEPARTMENT needs no id; the others need the matching target id. */
export type FeedbackTargetType = 'DEPARTMENT' | 'BATCH' | 'SECTION' | 'SUBJECT_OFFERING';

export type FeedbackFormStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

/** Anonymous or identified — the backend `anonymous` flag, named for display. */
export type FeedbackMode = 'ANONYMOUS' | 'IDENTIFIED';

export interface FeedbackQuestion {
  id: number;
  position: number;
  questionText: string;
  questionType: FeedbackQuestionType;
  required: boolean;
}

/** HOD responses carry submissionCount; student responses carry submitted. */
export interface FeedbackForm {
  id: number;
  title: string;
  description: string | null;
  targetType: FeedbackTargetType;
  targetBatchId: number | null;
  targetSectionId: number | null;
  targetSubjectOfferingId: number | null;
  targetLabel: string;
  anonymous: boolean;
  status: FeedbackFormStatus;
  openedAt: string | null;
  closedAt: string | null;
  questions: FeedbackQuestion[];
  submissionCount: number | null;
  submitted: boolean | null;
}

export interface FeedbackFormListQuery {
  page: number;
  size: number;
  status?: FeedbackFormStatus;
  targetType?: FeedbackTargetType;
}

export interface FeedbackFormRequest {
  title: string;
  description: string | null;
  targetType: FeedbackTargetType;
  targetBatchId: number | null;
  targetSectionId: number | null;
  targetSubjectOfferingId: number | null;
  anonymous: boolean;
  questions: { questionText: string; questionType: FeedbackQuestionType; required: boolean }[];
}

/** RATING: rating 1-5 and no text. TEXT: textAnswer and no rating. */
export interface FeedbackAnswer {
  questionId: number;
  rating: number | null;
  textAnswer: string | null;
}

export interface FeedbackSubmission {
  answers: FeedbackAnswer[];
}

export interface FeedbackQuestionStats {
  questionId: number;
  position: number;
  questionText: string;
  questionType: FeedbackQuestionType;
  answers: number;
  averageRating: number | null;
  /** Keys are ratings 1-5 (JSON object keys arrive as strings). */
  ratingDistribution: Record<string, number> | null;
  textAnswers: string[] | null;
}

export interface FeedbackAnalytics {
  formId: number;
  title: string;
  anonymous: boolean;
  status: FeedbackFormStatus;
  eligibleStudents: number;
  submissions: number;
  responseRatePercentage: number | null;
  questions: FeedbackQuestionStats[];
}

export interface FeedbackResponseItem {
  /** null for anonymous forms. */
  studentId: number | null;
  registerNumber: string | null;
  studentName: string | null;
  submittedAt: string | null;
  answers: FeedbackAnswer[];
}

export interface FeedbackResponses {
  formId: number;
  anonymous: boolean;
  responses: FeedbackResponseItem[];
}
