// /holidays — contract section E (docs/ERP_API_CONTRACT.md). Plain lists inside the standard ApiResponse wrapper.

/**
 * COLLEGE = the institution's own calendar (the only scope the default list returns);
 * NATIONAL / TAMIL_NADU = government reference lists, returned only with an explicit scope.
 * Typed as string too, so a new backend value never breaks the page.
 */
export type HolidayScope = 'COLLEGE' | 'NATIONAL' | 'TAMIL_NADU' | (string & {});

/**
 * GENERAL_HOLIDAY = the imported college rows; PUBLIC_HOLIDAY = government rows (read-only, never written).
 * The rest are the categories the HOD can choose.
 */
export type HolidayCategory =
  | 'GENERAL_HOLIDAY' | 'PUBLIC_HOLIDAY' | 'NATIONAL' | 'STATE' | 'INSTITUTIONAL' | 'ACADEMIC_BREAK' | 'OTHER' | (string & {});

/** Categories accepted on create / update. */
export const WRITABLE_HOLIDAY_CATEGORIES = ['NATIONAL', 'STATE', 'INSTITUTIONAL', 'ACADEMIC_BREAK', 'OTHER'] as const;

/** Year publication state. STAFF / STUDENT see DRAFT and NOT_CREATED as NOT_PUBLISHED. */
export type CalendarStatus = 'NOT_CREATED' | 'DRAFT' | 'PUBLISHED' | 'NOT_PUBLISHED';

/** One row as HolidayResponse sends it. */
export interface Holiday {
  id: number;
  name: string;
  /** yyyy-MM-dd */
  startDate: string;
  /** Inclusive; null for a one-day holiday. Always in the same calendar year as startDate. */
  endDate: string | null;
  /** Alias of startDate kept for older clients. */
  date: string;
  category: HolidayCategory;
  description: string | null;
  /** Empty = the whole institution; otherwise only these cohorts. */
  batchIds: number[];
  year: number;
  /** null for government rows. */
  calendarStatus: CalendarStatus | null;
  scope: HolidayScope;
  source: string;
  lastSyncedAt: string | null;
  updatedAt: string | null;
}

export interface HolidayListQuery {
  year: number;
}

/** GET /holidays/calendars/{year}. holidayCount is null for STAFF / STUDENT on unpublished years. */
export interface HolidayCalendarInfo {
  year: number;
  status: CalendarStatus;
  publishedAt: string | null;
  /** null when published by the system (migration or calendar-file import). */
  publishedBy: string | null;
  holidayCount: number | null;
}

/** POST /holidays and PUT /holidays/{id} body (full replace). */
export interface HolidayRequest {
  name: string;
  startDate: string;
  endDate: string | null;
  category: HolidayCategory;
  description: string | null;
  batchIds: number[];
}
