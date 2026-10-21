// Month-grid date helpers shared by the attendance calendar and the holiday calendar. Months are "yyyy-MM"
// and dates "yyyy-MM-dd", always in the browser's local time. Weeks start on Monday.

export const WEEK_HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10" → the dates of that month, with leading blanks so Monday is the first column. */
export const monthCells = (month: string): (string | null)[] => {
  const [y, m] = month.split('-').map(Number);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  // Day 0 of the next month is the last day of this one, so February gets 29 days in leap years.
  const days = new Date(y, m, 0).getDate();
  return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)];
};

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export const yearOf = (monthOrDate: string) => Number(monthOrDate.slice(0, 4));

export const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const monthTitle = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

/** e.g. "Thursday, 15 January" — used for screen-reader labels of calendar cells. */
export const cellLabel = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
