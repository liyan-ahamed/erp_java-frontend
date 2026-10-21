'use client';

import { PageContainer } from '@/components/common/PageContainer';
import { useAuth } from '@/contexts/auth-context';
import { useDashboardSummary } from '@/hooks/useDashboardQuery';
import { useUnreadCount } from '@/hooks/useNotifications';
import { ROUTES } from '@/constants/routes';
import { Bell, CalendarCheck, GraduationCap, Users } from '@/components/ui/icons';
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard';
import { ErrorBanner } from '@/components/gradebook/shared';
import { dashboardGreeting } from './greeting';
import { AttendanceByYearPanel, AverageMarksPanel, FailuresByYearPanel } from './YearAnalytics';

/** Value placeholder while a KPI loads; keeps the card height steady. */
const Pending = () => <span className="inline-block h-[30px] w-[64px] rounded-[7px] bg-soft animate-pulse" aria-label="Loading" />;
const Unavailable = () => <span className="text-muted">—</span>;

/** HOD dashboard: KPI row, attendance centrepiece, then marks and failures. Each section loads on its own. */
export function HodDashboard() {
  const { user } = useAuth();
  const summary = useDashboardSummary();
  const unread = useUnreadCount();
  const sections = summary.data?.section_wise_students.length;

  const summaryValue = (value: number | undefined) =>
    summary.isLoading ? <Pending /> : value === undefined ? <Unavailable /> : value.toLocaleString();

  return (
    <PageContainer
      eyebrow="Your department, connected"
      title={dashboardGreeting(user?.name)}
      description="Here’s an overview of your department today."
    >
      {summary.isError && (
        <div className="mb-[13px]">
          <ErrorBanner error={summary.error} fallback="Failed to load student and staff totals." title="Error Loading Dashboard" />
        </div>
      )}

      <MetricGrid>
        <MetricCard
          title="Total Students"
          value={summaryValue(summary.data?.total_students)}
          icon={<GraduationCap />}
          subtitle={sections !== undefined ? `Across ${sections} section${sections === 1 ? '' : 's'}` : 'Active students'}
          href={`${ROUTES.COURSES}?tab=enrollments`}
        />
        <MetricCard
          title="Total Staff"
          value={summaryValue(summary.data?.total_staff)}
          icon={<Users />}
          subtitle="Active staff accounts"
          href={ROUTES.USERS}
        />
        <MetricCard
          title="Average Student Attendance"
          value={<Unavailable />}
          icon={<CalendarCheck />}
          subtitle="Needs backend support"
          href={ROUTES.ATTENDANCE}
        />
        <MetricCard
          title="Unread Notifications"
          value={unread.isLoading ? <Pending /> : unread.isError ? <Unavailable /> : (unread.data ?? 0).toLocaleString()}
          icon={<Bell />}
          delta={unread.data ? 'New' : undefined}
          subtitle={unread.isError ? 'Could not load count' : 'Announcements and updates'}
          href={ROUTES.NOTIFICATIONS}
        />
      </MetricGrid>

      <AttendanceByYearPanel yearWise={summary.data?.year_wise_students} />

      <div className="grid grid-cols-1 xl:grid-cols-2 items-stretch gap-[21px]">
        <AverageMarksPanel />
        <FailuresByYearPanel />
      </div>
    </PageContainer>
  );
}
