'use client';

import { PageContainer } from '@/components/common/PageContainer';
import { useDashboardSummary } from '@/hooks/useDashboardQuery';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/auth-context';
import { Users, Calendar, Grid, GraduationCap, Bell } from '@/components/ui/icons';
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, LoadingBlock } from '@/components/gradebook/shared';
import { HodDashboard } from '@/components/dashboard/HodDashboard';
import { StaffDashboard } from '@/components/dashboard/StaffDashboard';
import { dashboardGreeting } from '@/components/dashboard/greeting';

export default function DashboardPage() {
  const { hasRole } = useAuth();
  if (hasRole('ROLE_HOD')) return <HodDashboard />;
  if (hasRole('ROLE_STAFF')) return <StaffDashboard />;
  return <GeneralDashboard />;
}

/** STUDENT dashboard (unchanged): totals plus students by year and section. */
function GeneralDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useDashboardSummary();
  const { data: unreadCount } = useUnreadCount();

  const frame = (children: React.ReactNode) => (
    <PageContainer
      eyebrow="Your department, connected"
      title={dashboardGreeting(user?.name)}
      description="Here’s an overview of your department today."
    >
      {children}
    </PageContainer>
  );

  if (isLoading) return frame(<LoadingBlock label="Loading dashboard…" />);

  if (isError) {
    return frame(<ErrorBanner error={error} fallback="Failed to load dashboard data." title="Error Loading Dashboard" />);
  }

  const sections = data?.section_wise_students ?? [];
  const years = data?.year_wise_students ?? [];

  return frame(
    <>
      <MetricGrid>
        <MetricCard
          title="Total Students"
          value={data?.total_students?.toLocaleString() ?? 0}
          icon={<GraduationCap />}
          subtitle={`Across ${sections.length} section${sections.length === 1 ? '' : 's'}`}
        />
        <MetricCard title="Total Staff" value={data?.total_staff?.toLocaleString() ?? 0} icon={<Users />} subtitle="Faculty and staff accounts" />
        <MetricCard
          title="Academic Years"
          value={years.length}
          icon={<Calendar />}
          subtitle="Years with enrolled students"
        />
        <MetricCard
          title="Unread Notifications"
          value={unreadCount ?? 0}
          icon={<Bell />}
          delta={unreadCount ? 'New' : undefined}
          subtitle="Announcements and updates"
        />
      </MetricGrid>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.45fr] items-start gap-[21px]">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Students by Year</h2>
              <p>Enrolled students in each academic year.</p>
            </div>
            <span className="metric-icon text-muted"><Calendar /></span>
          </div>
          {years.length > 0 ? (
            <div>
              {years.map((yearData) => (
                <div key={yearData.year} className="flex items-center justify-between gap-3 px-[21px] py-[15px] border-t border-dashed border-line">
                  <div>
                    <div className="text-[11px] text-muted">Academic year</div>
                    <h3 className="text-[14px] font-[550] mt-0.5">Year {yearData.year}</h3>
                  </div>
                  <span className="text-[20px] font-[550] tracking-[-0.5px]">{yearData.student_count}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock icon={<Calendar />} title="No year-wise data available." />
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Students by Section</h2>
              <p>Section strength across batches.</p>
            </div>
            <span className="badge">{sections.length} records</span>
          </div>
          {sections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((sectionData) => (
                  <TableRow key={sectionData.section_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-[9px]">
                        <Grid className="w-4 h-4 text-muted" />
                        {sectionData.section_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted">{sectionData.batch_name}</TableCell>
                    <TableCell className="text-right font-medium">{sectionData.student_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyBlock icon={<Grid />} title="No section-wise data available." />
          )}
        </section>
      </div>
    </>
  );
}
