import { BadgeProps } from '@/components/ui/Badge';
import { CalendarStatus, Holiday, HolidayCalendarInfo, HolidayRequest } from '@/types/holiday';

// Institution holiday calendar rules (contract E). Only the college's own calendar (scope COLLEGE) is shown.
// Only a PUBLISHED year affects scheduling (attendance, dashboard); the HOD additionally sees draft entries.
// Publication status always comes from GET /holidays/calendars/{year} — an empty list never means
// "not published" by itself.

export interface InstitutionCalendar {
  year: number;
  status: CalendarStatus;
  info: HolidayCalendarInfo;
  /** Every college holiday the backend returned for the year (HOD: drafts included), by start date. */
  holidays: Holiday[];
  /** Holidays that count: the year's holidays when it is PUBLISHED, otherwise none. */
  effective: Holiday[];
  /** Every day covered by `holidays` (ranges expanded). */
  byDate: Map<string, Holiday[]>;
  /** Every day covered by `effective`. */
  effectiveByDate: Map<string, Holiday[]>;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Each yyyy-MM-dd from startDate to endDate inclusive (one day when endDate is null). */
export const holidayDays = (h: Pick<Holiday, 'startDate' | 'endDate'>): string[] => {
  const [y, m, d] = h.startDate.split('-').map(Number);
  const days: string[] = [];
  const end = h.endDate ?? h.startDate;
  for (let i = 0; ; i++) {
    const t = new Date(y, m - 1, d + i);
    const iso = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    if (iso > end || i > 366) return days;
    days.push(iso);
  }
};

/** Every covered day → the holidays on it. */
export const indexByDate = (list: Holiday[]) => {
  const map = new Map<string, Holiday[]>();
  list.forEach((h) => holidayDays(h).forEach((day) => map.set(day, [...(map.get(day) ?? []), h])));
  return map;
};

export const toInstitutionCalendar = (info: HolidayCalendarInfo, rows: Holiday[]): InstitutionCalendar => {
  const holidays = rows
    .filter((h) => h.scope === 'COLLEGE')
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
  const effective = info.status === 'PUBLISHED' ? holidays : [];
  return { year: info.year, status: info.status, info, holidays, effective, byDate: indexByDate(holidays), effectiveByDate: indexByDate(effective) };
};

/** True when the holiday applies to the cohort (empty batchIds = the whole institution). */
export const appliesToCohort = (h: Pick<Holiday, 'batchIds'>, batchId: number) => h.batchIds.length === 0 || h.batchIds.includes(batchId);

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL_HOLIDAY: 'General Holiday',
  PUBLIC_HOLIDAY: 'Public Holiday',
  NATIONAL: 'National Holiday',
  STATE: 'State Holiday',
  INSTITUTIONAL: 'Institutional Holiday',
  ACADEMIC_BREAK: 'Academic Break',
  OTHER: 'Other',
};

const humanize = (value: string) =>
  value.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const holidayCategoryLabel = (category: string) => CATEGORY_LABEL[category] ?? humanize(category);

export interface HolidayStyle {
  /** Calendar cell background. */
  cell: string;
  /** Small dot used in cells, lists and the legend. */
  dot: string;
  badge: BadgeProps['variant'];
}

// Theme tokens only, so light and dark both work. Institution / general holidays are orange (as in the
// attendance calendar), leaving the accent for today / selection where possible.
const STYLES: Record<string, HolidayStyle> = {
  GENERAL_HOLIDAY: { cell: 'bg-warn-soft', dot: 'bg-warn', badge: 'warning' },
  INSTITUTIONAL: { cell: 'bg-warn-soft', dot: 'bg-warn', badge: 'warning' },
  NATIONAL: { cell: 'bg-danger-soft', dot: 'bg-danger', badge: 'error' },
  STATE: { cell: 'bg-ok-soft', dot: 'bg-ok', badge: 'success' },
  ACADEMIC_BREAK: { cell: 'bg-accent-soft', dot: 'bg-accent', badge: 'info' },
};
const NEUTRAL: HolidayStyle = { cell: 'bg-soft', dot: 'bg-muted', badge: 'default' };

export const holidayStyle = (category: string): HolidayStyle => STYLES[category] ?? NEUTRAL;

export const holidayDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** "Thu, 15 Jan 2026" or "Thu, 15 Jan – Sat, 17 Jan 2026". */
export const holidayRange = (h: Pick<Holiday, 'startDate' | 'endDate'>) => {
  if (!h.endDate || h.endDate === h.startDate) return holidayDate(h.startDate);
  const start = new Date(`${h.startDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${start} – ${holidayDate(h.endDate)}`;
};

export const CALENDAR_STATUS_LABEL: Record<CalendarStatus, string> = {
  PUBLISHED: 'Published',
  DRAFT: 'Draft',
  NOT_CREATED: 'Not created',
  NOT_PUBLISHED: 'Not published',
};

const MAX_HOLIDAY_DAYS = 60;

/** Quick checks that mirror the backend's rules; the backend's own 400/409 messages are still shown. */
export const holidayFormProblem = (f: HolidayRequest): string | null => {
  if (!f.name.trim()) return 'Enter the holiday name.';
  if (f.name.trim().length > 150) return 'The name can have at most 150 characters.';
  if (!f.startDate) return 'Choose the start date.';
  if (f.endDate) {
    if (f.endDate < f.startDate) return 'The end date can’t be before the start date.';
    if (f.endDate.slice(0, 4) !== f.startDate.slice(0, 4)) return 'A holiday can’t cross into another year. Add one entry per year.';
    const days = Math.round((Date.parse(`${f.endDate}T00:00:00Z`) - Date.parse(`${f.startDate}T00:00:00Z`)) / 86_400_000) + 1;
    if (days > MAX_HOLIDAY_DAYS) return `A holiday can cover at most ${MAX_HOLIDAY_DAYS} days.`;
  }
  if ((f.description ?? '').length > 500) return 'The description can have at most 500 characters.';
  return null;
};
