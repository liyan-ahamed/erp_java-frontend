import { ComponentType } from 'react';
import { ROUTES } from '@/constants/routes';
import { isPortfolioAnalyticsEnabled } from '@/lib/feature-flags';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Code2,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  ReceiptText,
  Trophy,
  Users,
  Wallet,
  BarChart3,
  Calculator,
} from '@/components/ui/icons';

export type NavRole = 'HOD' | 'STAFF' | 'STUDENT';
type IconComponent = ComponentType<{ className?: string }>;

export interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
  /** Active only on this exact path (the dashboard), not its sub-routes. */
  exact?: boolean;
}

export interface NavSection {
  /** Forma section label, shown uppercase. Empty for the top-level dashboard link. */
  label: string;
  items: NavItem[];
}

/** Active when on the route or one of its sub-routes (e.g. an attendance session). */
export const isActive = (pathname: string, href: string, exact?: boolean) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

const DASHBOARD: NavItem = { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, exact: true };

/**
 * Sidebar navigation per role, grouped Forma-style. Every page also guards itself with RequireRole —
 * hiding a link is not access control. Only routes that exist in this ERP are listed.
 */
export const buildNav = (role: NavRole, gradebook: boolean): { main: NavSection[]; admin: NavItem[] } => {
  if (role === 'STUDENT') {
    return {
      main: [
        { label: '', items: [DASHBOARD] },
        {
          label: 'Academics',
          items: [
            { href: ROUTES.COURSES, label: 'My Courses', icon: BookOpen },
            { href: ROUTES.TIMETABLE, label: 'Timetable', icon: CalendarDays },
            { href: ROUTES.ATTENDANCE, label: 'My Attendance', icon: ClipboardCheck },
            ...(gradebook
              ? [
                  { href: ROUTES.MY_GRADES, label: 'My Grades', icon: GraduationCap },
                  { href: ROUTES.INTERNAL_MARKS, label: 'Internal Marks', icon: Calculator },
                ]
              : []),
          ],
        },
        {
          label: 'Examinations',
          items: [
            { href: ROUTES.EXAM_REGISTRATION, label: 'Exam Registration', icon: CalendarCheck },
            { href: ROUTES.RESULTS, label: 'Result', icon: Award },
          ],
        },
        {
          label: 'Finance',
          items: [
            { href: ROUTES.FEES, label: 'My Fee Details', icon: Wallet },
            { href: ROUTES.RECEIPTS, label: 'My Receipts', icon: ReceiptText },
          ],
        },
        {
          label: 'Personal',
          items: [
            { href: ROUTES.FEEDBACK, label: 'Feedback', icon: MessageSquareText },
            { href: ROUTES.PORTFOLIO, label: 'My Portfolio', icon: Trophy },
            { href: ROUTES.LEETCODE, label: 'LeetCode', icon: Code2 },
          ],
        },
        {
          label: 'Schedule',
          items: [
            { href: '/dashboard/schedule/deadline', label: 'View Deadline', icon: Clock },
            { href: '/dashboard/schedule/poll', label: 'View Poll', icon: Calendar },
          ],
        },
      ],
      admin: [],
    };
  }

  const score: NavItem[] = gradebook
    ? [
        { href: ROUTES.ASSESSMENTS, label: 'Assessments', icon: GraduationCap },
        { href: ROUTES.INTERNAL_MARKS, label: 'Internal Marks', icon: Calculator },
      ]
    : [];
  // Portfolio Analytics is behind a frontend feature flag (lib/feature-flags.ts) and is off for now.
  const portfolio: NavItem[] = [
    { href: ROUTES.PORTFOLIO_REVIEW, label: 'Portfolio Review', icon: Trophy },
    ...(isPortfolioAnalyticsEnabled() ? [{ href: ROUTES.PORTFOLIO_ANALYTICS, label: 'Portfolio Analytics', icon: BarChart3 }] : []),
  ];

  if (role === 'STAFF') {
    return {
      main: [
        { label: '', items: [DASHBOARD] },
        {
          label: 'Teaching',
          items: [
            { href: ROUTES.COURSES, label: 'My Courses', icon: BookOpen },
            { href: ROUTES.TIMETABLE, label: 'My Timetable', icon: CalendarDays },
            { href: ROUTES.ATTENDANCE, label: 'Attendance', icon: ClipboardCheck },
            ...score,
            { href: ROUTES.RESULTS, label: 'Results', icon: Award },
          ],
        },
        { label: 'Students', items: [...portfolio, { href: ROUTES.LEETCODE, label: 'LeetCode', icon: Code2 }] },
        {
          label: 'Schedule',
          items: [
            { href: '/dashboard/schedule/deadline', label: 'Set Deadline', icon: Clock },
            { href: '/dashboard/schedule/poll', label: 'Set Poll', icon: Calendar },
          ],
        },
      ],
      // User management is HOD-only.
      admin: [],
    };
  }

  return {
    main: [
      { label: '', items: [DASHBOARD] },
      {
        label: 'Academics',
        items: [
          { href: ROUTES.COURSES, label: 'Courses', icon: BookOpen },
          { href: ROUTES.TIMETABLE, label: 'Timetable', icon: CalendarDays },
        ],
      },
      {
        label: 'Assessment',
        items: [
          { href: ROUTES.ATTENDANCE, label: 'Attendance', icon: ClipboardCheck },
          ...score,
          { href: ROUTES.EXAM_REGISTRATION, label: 'Exam Registration', icon: CalendarCheck },
          { href: ROUTES.RESULTS, label: 'Results', icon: Award },
        ],
      },
      {
        label: 'Finance',
        items: [
          { href: ROUTES.FEES, label: 'Fees', icon: Wallet },
          { href: ROUTES.RECEIPTS, label: 'Receipts', icon: ReceiptText },
        ],
      },
      {
        label: 'Students',
        items: [
          { href: ROUTES.FEEDBACK, label: 'Feedback', icon: MessageSquareText },
          ...portfolio,
          { href: ROUTES.LEETCODE, label: 'LeetCode', icon: Code2 },
        ],
      },
      {
        label: 'Schedule',
        items: [
          { href: '/dashboard/schedule/deadline', label: 'Deadlines', icon: Clock },
          { href: '/dashboard/schedule/poll', label: 'Polls', icon: Calendar },
        ],
      },
    ],
    admin: [
      { href: ROUTES.USERS, label: 'Users', icon: Users },
      { href: ROUTES.AUDIT_LOG, label: 'Audit Log', icon: FileCheck2 },
    ],
  };
};

export const NOTIFICATIONS_ITEM: NavItem = { href: ROUTES.NOTIFICATIONS, label: 'Notifications', icon: Bell };

interface PageMeta {
  title: string;
  subtitle: string;
}

/** Fixed page titles and one-line subtitles. Descriptive copy only — never data. */
const PAGES: Record<string, Partial<Record<NavRole | 'ALL', PageMeta>>> = {
  [ROUTES.DASHBOARD]: { ALL: { title: 'Dashboard', subtitle: 'Your department at a glance.' } },
  [ROUTES.COURSES]: {
    STUDENT: { title: 'My Courses', subtitle: 'The courses you are enrolled in.' },
    STAFF: { title: 'My Courses', subtitle: 'The courses you teach and their class rosters.' },
    HOD: { title: 'Courses', subtitle: 'Courses by cohort, semester and section, enrollments and the subject catalog.' },
  },
  [ROUTES.TIMETABLE]: {
    STUDENT: { title: 'My Timetable', subtitle: 'Your weekly class schedule.' },
    STAFF: { title: 'My Timetable', subtitle: 'Your weekly teaching schedule.' },
    HOD: { title: 'Timetable', subtitle: 'Weekly period schedule by class or faculty, and the holiday calendar.' },
  },
  [ROUTES.ATTENDANCE]: {
    STUDENT: { title: 'My Attendance', subtitle: 'Your attendance by subject and by day.' },
    STAFF: { title: 'Attendance', subtitle: 'Your classes by day, attendance taking and class summaries.' },
    HOD: { title: 'Attendance', subtitle: 'Subject overview, calendar and class detail for each class.' },
  },
  [ROUTES.FEES]: {
    STUDENT: { title: 'My Fee Details', subtitle: 'Charges, payments and balances on your account.' },
    ALL: { title: 'Fees', subtitle: 'Student charges, payments and fee structures.' },
  },
  [ROUTES.RECEIPTS]: {
    STUDENT: { title: 'My Receipts', subtitle: 'Receipts for payments recorded on your account.' },
    ALL: { title: 'Receipts', subtitle: 'Search and print payment receipts.' },
  },
  [ROUTES.EXAM_REGISTRATION]: {
    STUDENT: { title: 'Exam Registration', subtitle: 'Register for subjects in open exam periods.' },
    ALL: { title: 'Exam Registration', subtitle: 'Review registrations and manage exam periods.' },
  },
  [ROUTES.RESULTS]: {
    STUDENT: { title: 'Result', subtitle: 'Your published results by exam period.' },
    STAFF: { title: 'Results', subtitle: 'End-semester results and finalized CAT marks for the classes you teach (view only).' },
    HOD: { title: 'Results', subtitle: 'Review and publish exam results.' },
  },
  [ROUTES.FEEDBACK]: {
    STUDENT: { title: 'Feedback', subtitle: 'Feedback forms shared with you.' },
    ALL: { title: 'Feedback', subtitle: 'Build feedback forms and review responses.' },
  },
  [ROUTES.NOTIFICATIONS]: { ALL: { title: 'Notifications', subtitle: 'Announcements and updates for you.' } },
  [ROUTES.AUDIT_LOG]: { ALL: { title: 'Audit Log', subtitle: 'A timestamped record of activity in the system.' } },
  [ROUTES.USERS]: { ALL: { title: 'Users', subtitle: 'Admin, faculty and student accounts.' } },
  [ROUTES.SETTINGS]: { ALL: { title: 'Account Settings', subtitle: 'Your account details, email and password.' } },
  [ROUTES.ASSESSMENTS]: { ALL: { title: 'Assessments', subtitle: 'Assessments and grade entry by course.' } },
  [ROUTES.INTERNAL_MARKS]: { ALL: { title: 'Internal Marks', subtitle: 'Calculated internal marks by subject.' } },
  [ROUTES.MY_GRADES]: { ALL: { title: 'My Grades', subtitle: 'Your marks across assessments.' } },
  [ROUTES.LEETCODE]: { ALL: { title: 'LeetCode', subtitle: 'Coding practice progress.' } },
  [ROUTES.PORTFOLIO]: { ALL: { title: 'My Portfolio', subtitle: 'Your achievements and activities.' } },
  [ROUTES.PORTFOLIO_REVIEW]: { ALL: { title: 'Portfolio Review', subtitle: 'Verify or return submitted portfolio entries.' } },
  [ROUTES.PORTFOLIO_ANALYTICS]: { ALL: { title: 'Portfolio Analytics', subtitle: 'Portfolio activity across students.' } },
  '/dashboard/schedule/deadline': {
    STUDENT: { title: 'Deadlines', subtitle: 'Upcoming deadlines shared with you.' },
    ALL: { title: 'Deadlines', subtitle: 'Set and manage deadlines for students.' },
  },
  '/dashboard/schedule/poll': {
    STUDENT: { title: 'Polls', subtitle: 'Polls shared with you.' },
    ALL: { title: 'Polls', subtitle: 'Create polls and see responses.' },
  },
};

const DYNAMIC: { prefix: string; meta: PageMeta }[] = [
  { prefix: '/dashboard/attendance/sessions/', meta: { title: 'Take Attendance', subtitle: 'Mark and save attendance for this session.' } },
  { prefix: '/dashboard/portfolio/students/', meta: { title: 'Student Portfolio', subtitle: 'A student’s portfolio entries.' } },
  { prefix: '/dashboard/assessments/', meta: { title: 'Assessment', subtitle: 'Assessment details and grade entry.' } },
];

export const getPageMeta = (pathname: string, role: NavRole): PageMeta => {
  const entry = PAGES[pathname];
  if (entry) {
    const meta = entry[role] ?? entry.ALL;
    if (meta) return meta;
  }
  const dynamic = DYNAMIC.find((d) => pathname.startsWith(d.prefix));
  if (dynamic) return dynamic.meta;
  const last = pathname.split('/').filter((part) => part && !/^\d+$/.test(part)).pop() ?? 'dashboard';
  return { title: last.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), subtitle: '' };
};

/** The sidebar section a route belongs to, used as the top-bar breadcrumb. */
export const getSectionLabel = (pathname: string, role: NavRole, gradebook: boolean): string => {
  const { main, admin } = buildNav(role, gradebook);
  const best = [...main.flatMap((s) => s.items.map((item) => ({ item, label: s.label }))), ...admin.map((item) => ({ item, label: 'Administration' }))]
    .filter(({ item }) => isActive(pathname, item.href, item.exact))
    .sort((a, b) => b.item.href.length - a.item.href.length)[0];
  return best?.label || 'Department workspace';
};

export const roleOf = (hasRole: (role: 'ROLE_HOD' | 'ROLE_STAFF' | 'ROLE_STUDENT') => boolean): NavRole =>
  hasRole('ROLE_HOD') ? 'HOD' : hasRole('ROLE_STAFF') ? 'STAFF' : 'STUDENT';

export const ROLE_LABEL: Record<NavRole, string> = { HOD: 'HOD', STAFF: 'Faculty', STUDENT: 'Student' };

export const initialsOf = (name: string | undefined) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
