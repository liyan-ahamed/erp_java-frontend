'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/common/PageContainer';
import { MetricCard } from '@/components/ui/MetricCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Spinner } from '@/components/ui/Spinner';
import { useAttendanceSummary, useAttendanceRecords } from '@/hooks/useAttendance';
import { AttendanceFilters, AttendanceStatus } from '@/types/attendance';
import { DEPARTMENTS, ATTENDANCE_STATUSES } from '@/data/attendance-data';
import { Search, Users, UserX, Clock, AlertTriangle, Coffee, Laptop, ChevronLeft, ChevronRight, BarChart3, User } from 'lucide-react';

const statusBadge: Record<AttendanceStatus, { variant: 'success' | 'error' | 'warning' | 'info' | 'default' | 'outline'; label: string }> = {
  PRESENT: { variant: 'success', label: 'Present' },
  ABSENT: { variant: 'error', label: 'Absent' },
  LATE: { variant: 'warning', label: 'Late' },
  HALF_DAY: { variant: 'info', label: 'Half Day' },
  WORK_FROM_HOME: { variant: 'default', label: 'WFH' },
  ON_LEAVE: { variant: 'outline', label: 'On Leave' },
  WEEKEND: { variant: 'default', label: 'Weekend' },
  HOLIDAY: { variant: 'default', label: 'Holiday' },
};

export default function AttendancePage() {
  const [filters, setFilters] = useState<AttendanceFilters>({
    search: '',
    department: '',
    status: '',
    page: 0,
    size: 15,
  });

  const { data: summary, isLoading: summaryLoading } = useAttendanceSummary();
  const { data: records, isLoading: recordsLoading } = useAttendanceRecords(filters);

  const isLoading = summaryLoading || recordsLoading;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Spinner size="lg" />
          <p className="text-[#666666] font-medium text-sm">Loading attendance data...</p>
        </div>
      </PageContainer>
    );
  }

  const kpiSection = (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
      <MetricCard
        title="Present Today"
        value={summary?.present ?? 0}
        icon={<Users className="w-5 h-5" />}
        subtitle={`of ${summary?.total_employees ?? 0} employees`}
      />
      <MetricCard
        title="Absent"
        value={summary?.absent ?? 0}
        icon={<UserX className="w-5 h-5" />}
      />
      <MetricCard
        title="Late Arrivals"
        value={summary?.late ?? 0}
        icon={<AlertTriangle className="w-5 h-5" />}
      />
      <MetricCard
        title="Attendance %"
        value={`${summary?.attendance_percentage ?? 0}%`}
        icon={<BarChart3 className="w-5 h-5" />}
        trend={summary ? { value: 2.1, isPositive: true } : undefined}
      />
    </div>
  );

  const secondRow = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
      <MetricCard
        title="On Leave"
        value={summary?.on_leave ?? 0}
        icon={<Coffee className="w-5 h-5" />}
      />
      <MetricCard
        title="Half Day"
        value={summary?.half_day ?? 0}
        icon={<Clock className="w-5 h-5" />}
      />
      <MetricCard
        title="Remote (WFH)"
        value={summary?.work_from_home ?? 0}
        icon={<Laptop className="w-5 h-5" />}
      />
      <MetricCard
        title="Avg. Working Hours"
        value={`${summary?.average_working_hours ?? 0}h`}
        icon={<Clock className="w-5 h-5" />}
      />
    </div>
  );

  return (
    <PageContainer rawLayout={true}>
      <div className="space-y-6">
        {/* KPI Cards */}
        {kpiSection}
        {secondRow}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 w-full sm:max-w-xs">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder="Search employees..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 0 })}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value, page: 0 })}
              className="h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as AttendanceStatus | '', page: 0 })}
              className="h-10 px-3 text-sm border border-[#E8E8E8] rounded-[10px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
            >
              <option value="">All Status</option>
              {ATTENDANCE_STATUSES.filter(s => s !== 'WEEKEND' && s !== 'HOLIDAY').map(s => (
                <option key={s} value={s}>{statusBadge[s].label}</option>
              ))}
            </select>
            <Link href="/dashboard/attendance/analytics">
              <Button variant="outline" size="md">
                <BarChart3 className="w-4 h-4 mr-1.5" /> Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Attendance Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Working Hours</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attendance %</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records?.content.map((record) => {
                const sb = statusBadge[record.status];
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FAFAFA] border border-[#E8E8E8] flex items-center justify-center text-xs font-bold text-[#111111]">
                          {record.employee_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#111111] text-sm">{record.employee_name}</p>
                          <p className="text-[11px] text-[#9A9A9A]">{record.designation}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#666666] font-mono text-xs">{record.employee_code}</TableCell>
                    <TableCell className="text-[#666666]">{record.department}</TableCell>
                    <TableCell className="text-[#666666] font-mono text-xs">{record.check_in || '—'}</TableCell>
                    <TableCell className="text-[#666666] font-mono text-xs">{record.check_out || '—'}</TableCell>
                    <TableCell className="font-medium">{record.working_hours > 0 ? `${record.working_hours}h` : '—'}</TableCell>
                    <TableCell className={record.overtime > 0 ? 'text-[#059669] font-medium' : 'text-[#9A9A9A]'}>
                      {record.overtime > 0 ? `+${record.overtime}h` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sb.variant}>{sb.label}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{record.attendance_percentage}%</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/attendance/${record.employee_id}`}>
                        <Button variant="ghost" size="sm" className="px-2">
                          <User className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}

              {records?.content.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-[#D4D4D4]" />
                      <span className="text-sm text-[#666666]">No attendance records found</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {records && records.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#F5F5F5]">
              <span className="text-xs text-[#9A9A9A]">
                Showing {records.number * records.size + 1}–{Math.min((records.number + 1) * records.size, records.totalElements)} of {records.totalElements}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={records.number === 0} onClick={() => setFilters({ ...filters, page: (filters.page || 0) - 1 })}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(records.totalPages, 5) }, (_, i) => (
                  <Button key={i} variant={i === records.number ? 'primary' : 'ghost'} size="sm" onClick={() => setFilters({ ...filters, page: i })} className="w-8 h-8 p-0">
                    {i + 1}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" disabled={records.number >= records.totalPages - 1} onClick={() => setFilters({ ...filters, page: (filters.page || 0) + 1 })}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
