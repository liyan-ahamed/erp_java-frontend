'use client';

import { ComponentType, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ROUTES } from '@/constants/routes';
import { isGradebookEnabled } from '@/lib/feature-flags';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  Code2,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  NotebookPen,
  ReceiptText,
  Shield,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react';

type Icon = ComponentType<{ className?: string }>;
interface NavItem { href: string; label: string; icon: Icon; exact?: boolean }
interface NavGroup { label: string; icon: Icon; children: { href: string; label: string }[] }
type NavEntry = NavItem | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;

/** Active when on the route or one of its sub-routes (e.g. an attendance session). */
const matches = (pathname: string, href: string, exact?: boolean) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

const SCHEDULE = (isStaff: boolean): NavGroup => ({
  label: 'Schedule',
  icon: Calendar,
  children: [
    { href: '/dashboard/schedule/deadline', label: isStaff ? 'Set Deadline' : 'View Deadline' },
    { href: '/dashboard/schedule/poll', label: isStaff ? 'Set Poll' : 'View Poll' },
  ],
});

const COMMON_TAIL: NavItem[] = [
  { href: ROUTES.LEETCODE, label: 'LeetCode', icon: Code2 },
  { href: ROUTES.NOTIFICATIONS, label: 'Notifications', icon: Bell },
];

/** Navigation per role. Every page also guards itself with RequireRole — hiding a link is not access control. */
const buildNav = (role: 'HOD' | 'STAFF' | 'STUDENT', gradebook: boolean): NavEntry[] => {
  const dashboard: NavItem = { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, exact: true };

  if (role === 'STUDENT') {
    return [
      dashboard,
      { href: ROUTES.COURSE_ENROLLMENT, label: 'Course Enrollment', icon: BookOpen },
      { href: ROUTES.TIMETABLE, label: 'Timetable', icon: CalendarDays },
      { href: ROUTES.ATTENDANCE, label: 'My Attendance', icon: ClipboardCheck },
      { href: ROUTES.LESSON_PLAN, label: 'Lesson Plan', icon: NotebookPen },
      ...(gradebook ? [{
        label: 'Score', icon: GraduationCap,
        children: [{ href: ROUTES.MY_GRADES, label: 'My Grades' }, { href: ROUTES.INTERNAL_MARKS, label: 'Internal Marks' }],
      }] : []),
      { href: ROUTES.FEES, label: 'My Fee Details', icon: Wallet },
      { href: ROUTES.EXAM_REGISTRATION, label: 'Exam Registration', icon: CalendarCheck },
      { href: ROUTES.RESULTS, label: 'Result', icon: Award },
      { href: ROUTES.FEEDBACK, label: 'Feedback', icon: MessageSquareText },
      { href: ROUTES.RECEIPTS, label: 'My Receipts', icon: ReceiptText },
      { href: ROUTES.PORTFOLIO, label: 'My Portfolio', icon: Trophy },
      SCHEDULE(false),
      ...COMMON_TAIL,
    ];
  }

  const score: NavGroup[] = gradebook ? [{
    label: role === 'HOD' ? 'Score Overview' : 'Score / Gradebook', icon: GraduationCap,
    children: [{ href: ROUTES.ASSESSMENTS, label: 'Assessments' }, { href: ROUTES.INTERNAL_MARKS, label: 'Internal Marks' }],
  }] : [];
  const portfolio: NavGroup = {
    label: 'Portfolio', icon: Trophy,
    children: [{ href: ROUTES.PORTFOLIO_REVIEW, label: 'Review Queue' }, { href: ROUTES.PORTFOLIO_ANALYTICS, label: 'Analytics' }],
  };

  if (role === 'STAFF') {
    return [
      dashboard,
      { href: ROUTES.TIMETABLE, label: 'My Timetable', icon: CalendarDays },
      { href: ROUTES.ATTENDANCE, label: 'Attendance', icon: ClipboardCheck },
      { href: ROUTES.LESSON_PLAN, label: 'Lesson Plans', icon: NotebookPen },
      ...score,
      { href: ROUTES.RESULTS, label: 'Results', icon: Award },
      {
        label: 'Academics', icon: BookOpen,
        children: [
          { href: ROUTES.SUBJECTS, label: 'Subjects' },
          { href: ROUTES.SUBJECT_OFFERINGS, label: 'My Offerings' },
          { href: ROUTES.COURSE_ENROLLMENT, label: 'Class Rosters' },
        ],
      },
      portfolio,
      SCHEDULE(true),
      ...COMMON_TAIL,
      { href: ROUTES.USERS, label: 'Users', icon: Users },
    ];
  }

  return [
    dashboard,
    {
      label: 'Academics', icon: BookOpen,
      children: [
        { href: ROUTES.SUBJECTS, label: 'Subjects' },
        { href: ROUTES.SUBJECT_OFFERINGS, label: 'Subject Offerings' },
        { href: ROUTES.COURSE_ENROLLMENT, label: 'Course Enrollments' },
        { href: ROUTES.TIMETABLE, label: 'Timetable Management' },
      ],
    },
    { href: ROUTES.ATTENDANCE, label: 'Attendance Overview', icon: ClipboardCheck },
    { href: ROUTES.LESSON_PLAN, label: 'Lesson Plan Overview', icon: NotebookPen },
    ...score,
    {
      label: 'Examinations', icon: CalendarCheck,
      children: [{ href: ROUTES.EXAM_REGISTRATION, label: 'Exam Registration' }, { href: ROUTES.RESULTS, label: 'Results' }],
    },
    {
      label: 'Finance', icon: Wallet,
      children: [{ href: ROUTES.FEES, label: 'Fees' }, { href: ROUTES.RECEIPTS, label: 'Receipts' }],
    },
    { href: ROUTES.FEEDBACK, label: 'Feedback', icon: MessageSquareText },
    portfolio,
    SCHEDULE(false),
    ...COMMON_TAIL,
    { href: ROUTES.USERS, label: 'Users', icon: Users },
    { href: ROUTES.AUDIT_LOG, label: 'Audit Log', icon: Shield },
  ];
};

const itemClass = (active: boolean) =>
  `flex items-center px-3 py-2.5 rounded-[10px] font-medium text-sm transition-colors w-full ${
    active ? 'bg-[#FAFAFA] text-[#111111]' : 'text-[#666666] hover:bg-[#FAFAFA] hover:text-[#111111]'
  }`;

function Group({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate: () => void }) {
  const active = group.children.some((c) => matches(pathname, c.href));
  const [open, setOpen] = useState(active);
  return (
    <div className="flex flex-col space-y-1">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className={`${itemClass(active)} justify-between`}>
        <span className="flex items-center">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"><group.icon className="w-5 h-5" /></span>
          <span className="tracking-wide">{group.label}</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180 text-[#111111]' : 'text-[#9A9A9A]'}`} />
      </button>
      {open && (
        <div className="flex flex-col pl-14 pr-2 space-y-1 mt-1">
          {group.children.map((c) => (
            <Link key={c.href} href={c.href} onClick={onNavigate} aria-current={matches(pathname, c.href) ? 'page' : undefined}
              className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                matches(pathname, c.href) ? 'text-[#111111] bg-[#FAFAFA]' : 'text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA]'
              }`}>
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  /** Phones only: whether the off-canvas menu is showing. Always visible from md up. */
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user, hasRole, logout } = useAuth();
  const pathname = usePathname();
  const role = hasRole('ROLE_HOD') ? 'HOD' : hasRole('ROLE_STAFF') ? 'STAFF' : 'STUDENT';
  const nav = buildNav(role, isGradebookEnabled());

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={`w-72 max-w-[85vw] h-screen flex flex-col fixed left-0 top-0 z-40 p-4 justify-between select-none text-[#111111] bg-white border-r border-[#E8E8E8] transition-transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex flex-col space-y-6 overflow-y-auto pr-1">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center text-white bg-[#111111] rounded-xl shadow-sm">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-bold tracking-tight text-[#111111] leading-none mb-1">Dept. ERP</h1>
                <span className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider leading-none">Management System</span>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close menu" className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[#666666] hover:bg-[#F5F5F5]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col space-y-1">
            {nav.map((entry) =>
              isGroup(entry) ? (
                <Group key={entry.label} group={entry} pathname={pathname} onNavigate={onClose} />
              ) : (
                <Link key={entry.href} href={entry.href} onClick={onClose} aria-current={matches(pathname, entry.href, entry.exact) ? 'page' : undefined}
                  className={itemClass(matches(pathname, entry.href, entry.exact))}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"><entry.icon className="w-5 h-5" /></span>
                  <span className="tracking-wide">{entry.label}</span>
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="pt-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 rounded-[10px] px-2 py-2 flex-1 mr-1 border border-transparent">
            <div className="w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center text-[#111111] font-bold text-sm border border-[#E8E8E8]">
              {user?.name ? user.name.charAt(0) : 'D'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-[#111111] truncate">{user?.name || 'Dr Kumar'}</span>
              <span className="text-xs text-[#9A9A9A] truncate">{user?.designation || 'HOD'}</span>
            </div>
          </div>
          <button onClick={logout} className="w-9 h-9 flex items-center justify-center text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA] rounded-[10px] transition-all border border-transparent hover:border-[#E8E8E8]" title="Logout" aria-label="Logout">
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
