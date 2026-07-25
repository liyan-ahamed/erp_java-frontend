'use client';

import { PageContainer } from '@/components/common/PageContainer';
import { useDashboardSummary } from '@/hooks/useDashboardQuery';
import { Users, Calendar, Grid, GraduationCap } from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  const mainGlassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    borderRadius: '32px',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.1)',
  };

  const innerGlassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '20px',
    boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.3)',
  };

  const iconGlassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.35)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1.5px solid rgba(255, 255, 255, 0.65)',
    borderRadius: '22px',
    boxShadow: 'inset 0 4px 10px rgba(255,255,255,0.4)',
  };

  if (isLoading) {
    return (
      <PageContainer rawLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-700/30 border-t-slate-800 rounded-full animate-spin" />
          <p className="text-slate-600 font-medium text-sm">Loading dashboard analytics...</p>
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    const errorMessage =
      (error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load dashboard data.';
    return (
      <PageContainer rawLayout>
        <div
          className="p-6 text-red-700 font-medium text-sm"
          style={{
            background: 'rgba(254, 226, 226, 0.5)',
            backdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(252, 165, 165, 0.7)',
            borderRadius: '24px',
          }}
        >
          <h3 className="font-bold text-base mb-1 text-red-800">Error Loading Dashboard</h3>
          <p className="opacity-90">{errorMessage}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer rawLayout>
      <div className="space-y-8">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time statistics fetched from the ERP system API.</p>
        </div>

        {/* OVERVIEW CARDS: Total Students & Total Staff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Total Students */}
          <div className="p-7 flex items-center space-x-6 transition-all duration-300 hover:-translate-y-1" style={mainGlassStyle}>
            <div className="w-16 h-16 flex items-center justify-center text-slate-800" style={iconGlassStyle}>
              <GraduationCap className="w-8 h-8 text-slate-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                {data?.total_students?.toLocaleString() ?? 0}
              </h3>
            </div>
          </div>

          {/* Card 2: Total Staff */}
          <div className="p-7 flex items-center space-x-6 transition-all duration-300 hover:-translate-y-1" style={mainGlassStyle}>
            <div className="w-16 h-16 flex items-center justify-center text-slate-800" style={iconGlassStyle}>
              <Users className="w-8 h-8 text-slate-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Staff</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                {data?.total_staff?.toLocaleString() ?? 0}
              </h3>
            </div>
          </div>
        </div>

        {/* DYNAMIC DATA SECTIONS: Year-Wise & Section-Wise Students */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Year-Wise Students Card */}
          <div className="p-7 flex flex-col justify-between" style={mainGlassStyle}>
            <div className="flex items-center space-x-3.5 mb-6">
              <div className="w-11 h-11 flex items-center justify-center text-slate-700" style={iconGlassStyle}>
                <Calendar className="w-5 h-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Year-wise Students</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.year_wise_students?.map((yearData) => (
                <div
                  key={yearData.year}
                  className="p-5 flex items-center justify-between transition-all hover:bg-white/40"
                  style={innerGlassStyle}
                >
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Academic</span>
                    <h4 className="text-base font-bold text-slate-800 mt-0.5">Year {yearData.year}</h4>
                  </div>
                  <span className="text-2xl font-black text-slate-800">{yearData.student_count}</span>
                </div>
              ))}

              {(!data?.year_wise_students || data.year_wise_students.length === 0) && (
                <div className="col-span-full p-6 text-center text-slate-500 text-sm font-medium italic" style={innerGlassStyle}>
                  No year-wise data available.
                </div>
              )}
            </div>
          </div>

          {/* Section-Wise Students Card */}
          <div className="p-7 flex flex-col justify-between" style={mainGlassStyle}>
            <div className="flex items-center space-x-3.5 mb-6">
              <div className="w-11 h-11 flex items-center justify-center text-slate-700" style={iconGlassStyle}>
                <Grid className="w-5 h-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Section-wise Students</h2>
            </div>

            {data?.section_wise_students && data.section_wise_students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-400/20 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4 text-right">Students</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300/30">
                    {data.section_wise_students.map((sectionData) => (
                      <tr key={sectionData.section_id} className="hover:bg-white/30 transition-colors">
                        <td className="py-3.5 px-4 text-sm font-bold text-slate-800">
                          Section {sectionData.section_name}
                        </td>
                        <td className="py-3.5 px-4 text-sm font-medium text-slate-600">
                          {sectionData.batch_name}
                        </td>
                        <td className="py-3.5 px-4 text-sm font-black text-slate-800 text-right">
                          {sectionData.student_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm font-medium italic" style={innerGlassStyle}>
                No section-wise data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
