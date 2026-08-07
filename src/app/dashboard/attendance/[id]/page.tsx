'use client';

import { use } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/common/PageContainer';
import { MetricCard } from '@/components/ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useEmployeeAttendance } from '@/hooks/useAttendance';
import { AttendanceStatus } from '@/types/attendance';
import { ArrowLeft, BarChart3, Clock, AlertTriangle, Coffee, TrendingUp, Calendar } from 'lucide-react';

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

const statusColor: Record<AttendanceStatus, string> = {
  PRESENT: '#ECFDF5',
  ABSENT: '#FEF2F2',
  LATE: '#FFFBEB',
  HALF_DAY: '#EFF6FF',
  WORK_FROM_HOME: '#F5F5F5',
  ON_LEAVE: '#F5F5F5',
  WEEKEND: '#FAFAFA',
  HOLIDAY: '#EFF6FF',
};

export default function EmployeeAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const employeeId = parseInt(id, 10);
  const { data: profile, isLoading } = useEmployeeAttendance(employeeId);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Spinner size="lg" />
          <p className="text-[#666666] font-medium text-sm">Loading employee attendance...</p>
        </div>
      </PageContainer>
    );
  }

  if (!profile) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-[#666666] font-medium text-sm">Employee not found</p>
          <Link href="/dashboard/attendance">
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Attendance</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const { employee, monthly_records, attendance_percentage, average_working_hours, total_late_arrivals, total_leaves_taken, working_hour_trend } = profile;

  // Generate calendar data for the current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const firstDayOfWeek = monthStart.getDay(); // 0=Sun
  const daysInMonth = monthEnd.getDate();
  const calendarDays: (typeof monthly_records[0] | null)[] = [];

  // Pad start
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = monthly_records.find(r => r.date === dateStr);
    calendarDays.push(record || null);
  }

  const kpiSection = (
    <div className="space-y-4">
      {/* Back + Employee Info */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dashboard/attendance">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#FAFAFA] border border-[#E8E8E8] flex items-center justify-center text-base font-bold text-[#111111]">
            {employee.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#111111]">{employee.name}</h2>
            <p className="text-xs text-[#9A9A9A]">{employee.employee_id} · {employee.designation} · {employee.department}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard title="Attendance %" value={`${attendance_percentage}%`} icon={<BarChart3 className="w-5 h-5" />} />
        <MetricCard title="Avg. Working Hours" value={`${average_working_hours}h`} icon={<Clock className="w-5 h-5" />} />
        <MetricCard title="Late Arrivals" value={total_late_arrivals} icon={<AlertTriangle className="w-5 h-5" />} />
        <MetricCard title="Leaves Taken" value={total_leaves_taken} icon={<Coffee className="w-5 h-5" />} />
      </div>
    </div>
  );

  return (
    <PageContainer contextArea={kpiSection} rawLayout={true}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Calendar */}
        <Card>
          <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
            <Calendar className="w-4 h-4 text-[#9A9A9A]" />
            <CardTitle className="text-sm font-semibold">
              {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-[10px] font-semibold text-[#9A9A9A] text-center uppercase">{d}</div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((record, i) => {
                if (record === null && i < firstDayOfWeek) {
                  return <div key={i} className="aspect-square" />;
                }
                if (record === null) {
                  const day = i - firstDayOfWeek + 1;
                  return (
                    <div key={i} className="aspect-square rounded-lg bg-[#FAFAFA] flex items-center justify-center text-[11px] text-[#9A9A9A]">
                      {day <= daysInMonth ? day : ''}
                    </div>
                  );
                }
                const day = new Date(record.date).getDate();
                const bg = statusColor[record.status];
                const sb = statusBadge[record.status];
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] relative group cursor-default transition-transform hover:scale-105"
                    style={{ backgroundColor: bg }}
                    title={`${record.date}: ${sb.label}`}
                  >
                    <span className="font-semibold text-[#111111]">{day}</span>
                    <span className="text-[8px] text-[#666666] leading-none mt-0.5">{sb.label.substring(0, 3)}</span>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px] text-[#9A9A9A]">
              {Object.entries(statusColor).filter(([k]) => !['WEEKEND', 'HOLIDAY'].includes(k)).map(([status, color]) => (
                <span key={status} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  {statusBadge[status as AttendanceStatus].label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Working Hour Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
            <TrendingUp className="w-4 h-4 text-[#9A9A9A]" />
            <CardTitle className="text-sm font-semibold">Working Hours Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {working_hour_trend.length > 0 ? (
              <div className="space-y-2">
                {working_hour_trend.map((point, i) => {
                  const pct = Math.min((point.hours / 10) * 100, 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] text-[#9A9A9A] w-16 flex-shrink-0">
                        {new Date(point.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex-1 h-5 bg-[#F5F5F5] rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: point.hours >= 8 ? '#111111' : point.hours >= 7 ? '#666666' : '#D97706',
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#111111] w-10 text-right">{point.hours}h</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#9A9A9A] text-center py-8">No working hour data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance History Table */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
          <Clock className="w-4 h-4 text-[#9A9A9A]" />
          <CardTitle className="text-sm font-semibold">Attendance History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Working Hours</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthly_records.slice().reverse().slice(0, 30).map((record) => {
                const sb = statusBadge[record.status];
                return (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#666666]">{record.check_in || '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-[#666666]">{record.check_out || '—'}</TableCell>
                    <TableCell className="text-[#666666]">{record.break_duration > 0 ? `${record.break_duration}m` : '—'}</TableCell>
                    <TableCell className="font-medium">{record.working_hours > 0 ? `${record.working_hours}h` : '—'}</TableCell>
                    <TableCell className={record.overtime > 0 ? 'text-[#059669] font-medium' : 'text-[#9A9A9A]'}>
                      {record.overtime > 0 ? `+${record.overtime}h` : '—'}
                    </TableCell>
                    <TableCell><Badge variant={sb.variant}>{sb.label}</Badge></TableCell>
                    <TableCell className="text-[#666666]">{record.location}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
