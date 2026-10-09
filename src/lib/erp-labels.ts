import { BadgeProps } from '@/components/ui/Badge';
import { EnrollmentStatus } from '@/types/enrollment';
import { DayOfWeek, TimetableSlotType } from '@/types/timetable';
import { AttendanceRecordStatus, AttendanceSessionStatus, AttendanceStatus } from '@/types/attendance';
import { LessonPlanStatus } from '@/types/lesson-plan';
import { FeeStatus, FeeType, PaymentMethod } from '@/types/fees';
import { ExamPeriodStatus, ExamRegistrationStatus, ExamType } from '@/types/exam';
import { ResultSheetStatus, ResultStatus } from '@/types/result';
import { FeedbackFormStatus, FeedbackQuestionType, FeedbackTargetType } from '@/types/feedback';

// Display-only labels for backend enum values of the student ERP modules. API calls always use
// the raw values. Every badge has a text label, so status is never shown by colour alone.

type BadgeInfo = { label: string; variant: BadgeProps['variant'] };

// ---------- Enrollment ----------

export const ENROLLMENT_STATUSES: EnrollmentStatus[] = ['ENROLLED', 'DROPPED', 'COMPLETED'];
export const ENROLLMENT_STATUS_BADGE: Record<EnrollmentStatus, BadgeInfo> = {
  ENROLLED: { label: 'Enrolled', variant: 'success' },
  DROPPED: { label: 'Dropped', variant: 'error' },
  COMPLETED: { label: 'Completed', variant: 'info' },
};

// ---------- Timetable ----------

export const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday',
  FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};
export const SLOT_TYPES: TimetableSlotType[] = ['LECTURE', 'LAB', 'TUTORIAL', 'OTHER'];
export const SLOT_TYPE_LABELS: Record<TimetableSlotType, string> = {
  LECTURE: 'Lecture', LAB: 'Lab', TUTORIAL: 'Tutorial', OTHER: 'Other',
};

/** "09:00:00" -> "09:00". */
export const formatTime = (value: string | null | undefined) => (value ? value.slice(0, 5) : '—');

/** Day of week of an ISO date (yyyy-MM-dd), in the backend's DayOfWeek naming. */
export const dayOfDate = (isoDate: string): DayOfWeek | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  return (['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as DayOfWeek[])[new Date(y, m - 1, d).getDay()];
};

/** Today as yyyy-MM-dd in the browser's local time. */
export const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// ---------- Attendance ----------

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'ON_DUTY', 'EXCUSED'];
export const ATTENDANCE_STATUS_BADGE: Record<AttendanceRecordStatus, BadgeInfo> = {
  PRESENT: { label: 'Present', variant: 'success' },
  ABSENT: { label: 'Absent', variant: 'error' },
  ON_DUTY: { label: 'On Duty', variant: 'info' },
  EXCUSED: { label: 'Excused', variant: 'warning' },
  NOT_MARKED: { label: 'Not marked', variant: 'default' },
};
export const SESSION_STATUS_BADGE: Record<AttendanceSessionStatus, BadgeInfo> = {
  DRAFT: { label: 'Draft', variant: 'warning' },
  FINALIZED: { label: 'Finalized', variant: 'success' },
};
export const NO_ATTENDANCE_DATA_TEXT = 'Not enough attendance data';

/** Backend percentage as returned (null = nothing to count — never shown as 0%). */
export const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? null : `${Number(value)}%`;

// ---------- Lesson plans ----------

export const LESSON_PLAN_STATUSES: LessonPlanStatus[] = ['PLANNED', 'COMPLETED', 'CANCELLED'];
export const LESSON_PLAN_STATUS_BADGE: Record<LessonPlanStatus, BadgeInfo> = {
  PLANNED: { label: 'Planned', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
};

// ---------- Fees ----------

export const FEE_TYPES: FeeType[] = ['TUITION', 'EXAM', 'LAB', 'DEPARTMENT', 'OTHER'];
export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  TUITION: 'Tuition', EXAM: 'Exam', LAB: 'Lab', DEPARTMENT: 'Department', OTHER: 'Other',
};
export const FEE_STATUSES: FeeStatus[] = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED'];
export const FEE_STATUS_BADGE: Record<FeeStatus, BadgeInfo> = {
  UNPAID: { label: 'Unpaid', variant: 'error' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'success' },
  WAIVED: { label: 'Waived', variant: 'info' },
};
export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'UPI', 'OTHER'];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Bank Transfer', UPI: 'UPI', OTHER: 'Other',
};

const MONEY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

/** Formats a backend amount for display only (no arithmetic is done on money in the browser). */
export const formatMoney = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : MONEY.format(Number(value));

/** A positive amount with at most 10 digits and 2 decimals, checked as text (no float maths). */
export const moneyProblem = (text: string): string | null => {
  const value = text.trim();
  if (!value) return 'Enter an amount.';
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) return 'Use a plain amount with at most 2 decimals, e.g. 1500 or 1500.50.';
  if (/^0*(\.0*)?$/.test(value)) return 'The amount must be greater than zero.';
  return null;
};

export const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/;

// ---------- Exams ----------

export const EXAM_TYPES: ExamType[] = ['INTERNAL', 'END_SEMESTER', 'SUPPLEMENTARY'];
export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  INTERNAL: 'Internal', END_SEMESTER: 'End Semester', SUPPLEMENTARY: 'Supplementary',
};
export const EXAM_PERIOD_STATUSES: ExamPeriodStatus[] = ['DRAFT', 'OPEN', 'CLOSED'];
export const EXAM_PERIOD_STATUS_BADGE: Record<ExamPeriodStatus, BadgeInfo> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  OPEN: { label: 'Open', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'outline' },
};
export const EXAM_REGISTRATION_STATUSES: ExamRegistrationStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
export const EXAM_REGISTRATION_STATUS_BADGE: Record<ExamRegistrationStatus, BadgeInfo> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  SUBMITTED: { label: 'Submitted', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'error' },
};
export const MIN_REJECTION_NOTE = 5;

// ---------- Results ----------

export const RESULT_STATUSES: ResultStatus[] = ['PASS', 'FAIL', 'ABSENT', 'WITHHELD'];
export const RESULT_STATUS_BADGE: Record<ResultSheetStatus, BadgeInfo> = {
  PASS: { label: 'Pass', variant: 'success' },
  FAIL: { label: 'Fail', variant: 'error' },
  ABSENT: { label: 'Absent', variant: 'warning' },
  WITHHELD: { label: 'Withheld', variant: 'info' },
  NOT_ENTERED: { label: 'Not entered', variant: 'default' },
};
export const PUBLISHED_BADGE = (published: boolean): BadgeInfo =>
  published ? { label: 'Published', variant: 'success' } : { label: 'Unpublished', variant: 'warning' };

// ---------- Feedback ----------

export const FEEDBACK_QUESTION_TYPES: FeedbackQuestionType[] = ['RATING', 'TEXT'];
export const FEEDBACK_QUESTION_TYPE_LABELS: Record<FeedbackQuestionType, string> = {
  RATING: 'Rating (1–5)', TEXT: 'Text answer',
};
export const FEEDBACK_TARGET_TYPES: FeedbackTargetType[] = ['DEPARTMENT', 'BATCH', 'SECTION', 'SUBJECT_OFFERING'];
export const FEEDBACK_TARGET_LABELS: Record<FeedbackTargetType, string> = {
  DEPARTMENT: 'Whole department', BATCH: 'Batch', SECTION: 'Section', SUBJECT_OFFERING: 'Subject offering',
};
export const FEEDBACK_FORM_STATUSES: FeedbackFormStatus[] = ['DRAFT', 'OPEN', 'CLOSED'];
export const FEEDBACK_FORM_STATUS_BADGE: Record<FeedbackFormStatus, BadgeInfo> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  OPEN: { label: 'Open', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'outline' },
};
export const RATING_VALUES = [1, 2, 3, 4, 5];
