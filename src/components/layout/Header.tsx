'use client';

import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard/portfolio': 'My Portfolio',
  '/dashboard/portfolio/review': 'Portfolio Review',
  '/dashboard/portfolio/analytics': 'Portfolio Analytics',
  '/dashboard/course-enrollment': 'Course Enrollment',
  '/dashboard/timetable': 'Timetable',
  '/dashboard/attendance': 'Attendance',
  '/dashboard/lesson-plan': 'Lesson Plan',
  '/dashboard/fees': 'Fees',
  '/dashboard/receipts': 'Receipts',
  '/dashboard/exam-registration': 'Exam Registration',
  '/dashboard/results': 'Results',
  '/dashboard/feedback': 'Feedback',
};

/** Students see their own records on these routes. */
const STUDENT_TITLES: Record<string, string> = {
  '/dashboard/timetable': 'My Timetable',
  '/dashboard/attendance': 'My Attendance',
  '/dashboard/fees': 'My Fee Details',
  '/dashboard/receipts': 'My Receipts',
  '/dashboard/results': 'Result',
};

export const Header = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
  const { user, hasRole } = useAuth();
  const pathname = usePathname();

  // Format pathname for header title (e.g. /dashboard/schedule/deadline -> Schedule Deadline)
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (hasRole('ROLE_STUDENT') && STUDENT_TITLES[pathname]) return STUDENT_TITLES[pathname];
    if (hasRole('ROLE_STAFF') && pathname === '/dashboard/timetable') return 'My Timetable';
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    if (pathname.startsWith('/dashboard/portfolio/students/')) return 'Student Portfolio';
    if (pathname.startsWith('/dashboard/attendance/sessions/')) return 'Take Attendance';
    // Skip id segments, e.g. /dashboard/assessments/12 -> Assessments.
    const parts = pathname.split('/').filter((part) => part && !/^\d+$/.test(part));
    if (parts.length > 1) {
      // Just take the last part and capitalize
      const lastPart = parts[parts.length - 1];
      return lastPart.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    return 'Overview';
  };

  return (
    <header className="h-[72px] bg-white border-b border-[#E8E8E8] flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 transition-all">
      <div className="flex items-center flex-1 min-w-0 gap-3">
        <button onClick={onOpenMenu} aria-label="Open menu" className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] text-[#111111] hover:bg-[#F5F5F5] border border-[#E8E8E8]">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg md:text-xl font-bold text-[#111111] truncate">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-3 cursor-pointer hover:bg-[#FAFAFA] p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-[#E8E8E8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://ui-avatars.com/api/?name=${user.name}&background=fafafa&color=111111`}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-[#E8E8E8]"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#FAFAFA] border border-[#E8E8E8] flex items-center justify-center text-sm font-medium text-[#9A9A9A]">
            ?
          </div>
        )}
      </div>
    </header>
  );
};
