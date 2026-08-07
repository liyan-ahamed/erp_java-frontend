'use client';

import { PageContainer } from '@/components/common/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAttendanceAnalytics } from '@/hooks/useAttendance';
import { TrendingUp, BarChart3, Clock, Users, PieChart, Laptop } from 'lucide-react';

// Simple inline bar chart component
const BarChart = ({ data, labelKey, valueKey, maxValue, color = '#111111' }: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  maxValue?: number;
  color?: string;
}) => {
  const max = maxValue || Math.max(...data.map(d => Number(d[valueKey])));
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-[#666666] w-28 truncate flex-shrink-0">{String(item[labelKey])}</span>
          <div className="flex-1 h-7 bg-[#F5F5F5] rounded-lg overflow-hidden relative">
            <div
              className="h-full rounded-lg transition-all duration-500"
              style={{
                width: `${max > 0 ? (Number(item[valueKey]) / max) * 100 : 0}%`,
                backgroundColor: color,
                minWidth: Number(item[valueKey]) > 0 ? '2px' : '0',
              }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#666666]">
              {typeof item[valueKey] === 'number' && String(item[valueKey]).includes('.') 
                ? `${String(item[valueKey])}%` 
                : String(item[valueKey])}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Mini sparkline
const SparkLine = ({ data, height = 60 }: { data: number[]; height?: number }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <polyline
        points={points}
        fill="none"
        stroke="#111111"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fill area */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#gradient)"
        opacity="0.1"
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#111111" />
          <stop offset="100%" stopColor="#111111" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default function AttendanceAnalyticsPage() {
  const { data: analytics, isLoading } = useAttendanceAnalytics();

  if (isLoading || !analytics) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Spinner size="lg" />
          <p className="text-[#666666] font-medium text-sm">Loading analytics...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer rawLayout={true}>
      <div className="space-y-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
            <TrendingUp className="w-4 h-4 text-[#9A9A9A]" />
            <CardTitle className="text-sm font-semibold">Daily Attendance Trend (14 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-4">
              <SparkLine data={analytics.daily_trend.map(d => d.present)} height={80} />
            </div>
            <div className="grid grid-cols-7 md:grid-cols-14 gap-1">
              {analytics.daily_trend.map((day, i) => {
                const total = day.present + day.absent + day.late;
                const pct = total > 0 ? Math.round((day.present / total) * 100) : 0;
                const dateObj = new Date(day.date);
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-semibold transition-colors"
                      style={{
                        backgroundColor: pct > 80 ? '#ECFDF5' : pct > 50 ? '#FFFBEB' : total === 0 ? '#F5F5F5' : '#FEF2F2',
                        color: pct > 80 ? '#059669' : pct > 50 ? '#D97706' : total === 0 ? '#9A9A9A' : '#DC2626',
                      }}
                    >
                      {total > 0 ? `${pct}%` : '—'}
                    </div>
                    <span className="text-[9px] text-[#9A9A9A] mt-1">
                      {dateObj.toLocaleDateString('en-IN', { day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-[#9A9A9A]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#ECFDF5]" /> &gt;80%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#FFFBEB]" /> 50-80%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#FEF2F2]" /> &lt;50%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#F5F5F5]" /> No data</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Comparison */}
          <Card>
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
              <BarChart3 className="w-4 h-4 text-[#9A9A9A]" />
              <CardTitle className="text-sm font-semibold">Department Attendance</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BarChart
                data={analytics.department_comparison}
                labelKey="department"
                valueKey="percentage"
                maxValue={100}
              />
            </CardContent>
          </Card>

          {/* Late Arrival Trend */}
          <Card>
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
              <Clock className="w-4 h-4 text-[#9A9A9A]" />
              <CardTitle className="text-sm font-semibold">Late Arrivals (14 Days)</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BarChart
                data={analytics.late_arrival_trend}
                labelKey="date"
                valueKey="count"
                color="#D97706"
              />
            </CardContent>
          </Card>

          {/* Working Hours Distribution */}
          <Card>
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
              <Users className="w-4 h-4 text-[#9A9A9A]" />
              <CardTitle className="text-sm font-semibold">Working Hours Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BarChart
                data={analytics.working_hours_distribution}
                labelKey="range"
                valueKey="count"
                color="#2563EB"
              />
            </CardContent>
          </Card>

          {/* Leave Distribution */}
          <Card>
            <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
              <PieChart className="w-4 h-4 text-[#9A9A9A]" />
              <CardTitle className="text-sm font-semibold">Leave Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BarChart
                data={analytics.leave_distribution}
                labelKey="type"
                valueKey="count"
                color="#059669"
              />
            </CardContent>
          </Card>
        </div>

        {/* Remote vs Office */}
        <Card>
          <CardHeader className="flex flex-row items-center space-x-2 space-y-0 border-b-0 pb-0">
            <Laptop className="w-4 h-4 text-[#9A9A9A]" />
            <CardTitle className="text-sm font-semibold">Remote vs Office (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#666666]">Office</span>
                  <span className="text-sm font-semibold text-[#111111]">{analytics.remote_vs_office.office}</span>
                </div>
                <div className="h-3 bg-[#F5F5F5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#111111] rounded-full transition-all duration-500"
                    style={{
                      width: `${(analytics.remote_vs_office.office / (analytics.remote_vs_office.office + analytics.remote_vs_office.remote)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#666666]">Remote</span>
                  <span className="text-sm font-semibold text-[#111111]">{analytics.remote_vs_office.remote}</span>
                </div>
                <div className="h-3 bg-[#F5F5F5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#666666] rounded-full transition-all duration-500"
                    style={{
                      width: `${(analytics.remote_vs_office.remote / (analytics.remote_vs_office.office + analytics.remote_vs_office.remote)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
