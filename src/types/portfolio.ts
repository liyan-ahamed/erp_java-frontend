// Student Achievement & Activity Portfolio — mirrors the backend /portfolio DTOs.
// Item fields are camelCase; paged lists use the shared snake_case wrapper (see mapPage).

export type PortfolioStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export type PortfolioActivityType =
  | 'HACKATHON'
  | 'CERTIFICATION'
  | 'COMPETITION'
  | 'WORKSHOP'
  | 'INTERNSHIP'
  | 'RESEARCH_PUBLICATION'
  | 'CONFERENCE'
  | 'TECHNICAL_EVENT'
  | 'PROJECT_SHOWCASE'
  | 'CLUB_ACTIVITY'
  | 'OTHER';

export type PortfolioLevel = 'COLLEGE' | 'INTER_COLLEGE' | 'STATE' | 'NATIONAL' | 'INTERNATIONAL' | 'ONLINE' | 'OTHER';

/**
 * reviewedBy* / reviewedAt / reviewNote describe the latest decision. A SUBMITTED entry that was
 * rejected before still carries that rejection until it is reviewed again.
 */
export interface PortfolioEntry {
  id: number;
  studentId: number;
  studentName: string;
  registerNumber: string | null;
  batchId: number;
  batchName: string;
  sectionId: number;
  sectionName: string;
  activityType: PortfolioActivityType;
  title: string;
  organization: string | null;
  description: string | null;
  level: PortfolioLevel | null;
  roleOrPosition: string | null;
  achievementResult: string | null;
  /** yyyy-MM-dd */
  startDate: string | null;
  endDate: string | null;
  evidenceUrl: string | null;
  status: PortfolioStatus;
  submittedAt: string | null;
  reviewedById: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /portfolio/entries and PUT /portfolio/entries/{id} (full replace). Only activityType and
 * title are needed for a draft; the rest is checked when the entry is submitted.
 */
export interface PortfolioEntryRequest {
  activityType: PortfolioActivityType;
  title: string;
  organization: string | null;
  description: string | null;
  level: PortfolioLevel | null;
  roleOrPosition: string | null;
  achievementResult: string | null;
  startDate: string | null;
  endDate: string | null;
  evidenceUrl: string | null;
}

export type PortfolioCreateRequest = PortfolioEntryRequest;
export type PortfolioUpdateRequest = PortfolioEntryRequest;

/** Verify: note optional. Reject: note required (10+ characters). */
export interface PortfolioReviewRequest {
  reviewNote?: string;
}

export interface MyPortfolioQuery {
  page: number;
  size: number;
  status?: PortfolioStatus;
  activityType?: PortfolioActivityType;
  year?: number;
}

/** status defaults to SUBMITTED on the backend; DRAFT is refused. */
export interface PortfolioReviewQuery {
  page: number;
  size: number;
  status?: Exclude<PortfolioStatus, 'DRAFT'>;
  activityType?: PortfolioActivityType;
  level?: PortfolioLevel;
  batchId?: number;
  sectionId?: number;
  search?: string;
}

/** GET /portfolio/me/summary — counts over all of the student's own entries. */
export interface MyPortfolioSummary {
  totalEntries: number;
  draft: number;
  submitted: number;
  verified: number;
  rejected: number;
  byActivityType: Record<PortfolioActivityType, number>;
}

export type PortfolioSummaryScope = 'DEPARTMENT' | 'ASSIGNED_SECTIONS';

/**
 * GET /portfolio/summary — HOD: whole department, STAFF: sections they teach. Drafts are not
 * counted; the breakdowns count VERIFIED entries only.
 */
export interface PortfolioSummary {
  scope: PortfolioSummaryScope;
  verified: number;
  pendingReview: number;
  rejected: number;
  studentsWithVerifiedEntries: number;
  verifiedByActivityType: Record<PortfolioActivityType, number>;
  verifiedByLevel: Record<PortfolioLevel, number>;
  verifiedByBatch: { batchId: number; batchName: string; currentYear: number | null; verified: number }[];
  verifiedBySection: { sectionId: number; sectionName: string; batchId: number; batchName: string; verified: number }[];
}

/** GET /portfolio/students/{studentId} — VERIFIED entries only, newest activity first. */
export interface StudentPortfolioSummary {
  studentId: number;
  studentName: string;
  registerNumber: string | null;
  batchId: number;
  batchName: string;
  sectionId: number;
  sectionName: string;
  verifiedCount: number;
  verifiedByActivityType: Record<PortfolioActivityType, number>;
  entries: PortfolioEntry[];
}
