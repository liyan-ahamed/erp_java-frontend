'use client';

import { PageContainer } from '@/components/common/PageContainer';
import { useDashboardSummary } from '@/hooks/useDashboardQuery';
import { useUnreadCount } from '@/hooks/useNotifications';
import { Users, Calendar, Grid, GraduationCap, Bell } from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Spinner } from '@/components/ui/Spinner';
import { getApiErrorMessage } from '@/lib/api-error';

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboardSummary();
  const { data: unreadCount } = useUnreadCount();

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Spinner size="lg" />
          <p className="text-[#666666] font-medium text-sm">Loading dashboard analytics...</p>
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    const errorMessage = getApiErrorMessage(error, 'Failed to load dashboard data.');
    return (
      <PageContainer>
        <div className="p-5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
          <h3 className="font-bold text-sm mb-1 text-[#DC2626]">Error Loading Dashboard</h3>
          <p className="text-sm text-[#DC2626]">{errorMessage}</p>
        </div>
      </PageContainer>
    );
  }

  const kpiSection = (
    <div className="space-y-6">
      {/* Existing KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard 
          title="Total Students" 
          value={data?.total_students?.toLocaleString() ?? 0}
          icon={<GraduationCap className="w-5 h-5" />}
        />
        <MetricCard 
          title="Total Staff" 
          value={data?.total_staff?.toLocaleString() ?? 0}
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* Second row: Notifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard 
          title="Unread Notifications" 
          value={unreadCount ?? 0}
          icon={<Bell className="w-5 h-5" />}
        />
      </div>
    </div>
  );

  return (
    <PageContainer 
      contextArea={kpiSection}
      rawLayout={true}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Year-Wise Students */}
        <Card>
          <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
            <Calendar className="w-4 h-4 text-[#9A9A9A]" />
            <CardTitle className="text-sm font-semibold">Students by Year</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.year_wise_students?.map((yearData) => (
                <div
                  key={yearData.year}
                  className="p-4 flex items-center justify-between bg-white border border-[#E8E8E8] rounded-[10px] shadow-sm hover:border-[#D4D4D4] transition-colors"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Academic</span>
                    <h4 className="text-sm font-semibold text-[#111111] mt-0.5">Year {yearData.year}</h4>
                  </div>
                  <span className="text-xl font-bold text-[#111111]">{yearData.student_count}</span>
                </div>
              ))}

              {(!data?.year_wise_students || data.year_wise_students.length === 0) && (
                <div className="col-span-full py-8 text-center text-[#666666] text-sm font-medium">
                  No year-wise data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section-Wise Students */}
        <Card>
          <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
            <Grid className="w-4 h-4 text-[#9A9A9A]" />
            <CardTitle className="text-sm font-semibold">Students by Section</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {data?.section_wise_students && data.section_wise_students.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.section_wise_students.map((sectionData) => (
                    <TableRow key={sectionData.section_id}>
                      <TableCell className="font-medium">{sectionData.section_name}</TableCell>
                      <TableCell className="text-[#666666]">{sectionData.batch_name}</TableCell>
                      <TableCell className="text-right font-medium">{sectionData.student_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-[#666666] text-sm font-medium">
                No section-wise data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
