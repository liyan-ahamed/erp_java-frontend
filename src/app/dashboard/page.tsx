'use client';

import { PageContainer } from '@/components/common/PageContainer';
import { useDashboardSummary } from '@/hooks/useDashboardQuery';

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <PageContainer title="Dashboard" description="Welcome to the Generic ERP System">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 font-medium">Loading dashboard data...</div>
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    const errorMessage = (error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load dashboard data.';
    return (
      <PageContainer title="Dashboard" description="Welcome to the Generic ERP System">
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
          {errorMessage}
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer title="Dashboard" description="Welcome to the Generic ERP System">
        <div className="p-4 bg-gray-50 text-gray-500 rounded-lg border border-gray-100">
          No data available.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard" description="Welcome to the Generic ERP System">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm flex flex-col">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Students</h3>
          <p className="text-3xl font-bold text-gray-900">{data.total_students}</p>
        </div>
        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm flex flex-col">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Staff</h3>
          <p className="text-3xl font-bold text-gray-900">{data.total_staff}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Year-wise Students */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Students by Year</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.year_wise_students?.map((yearData) => (
              <div key={yearData.year} className="p-5 bg-white border border-gray-100 rounded-lg shadow-sm flex justify-between items-center">
                <span className="font-medium text-gray-700">Year {yearData.year}</span>
                <span className="text-xl font-semibold text-indigo-600">{yearData.student_count}</span>
              </div>
            ))}
            {(!data.year_wise_students || data.year_wise_students.length === 0) && (
              <div className="col-span-full text-sm text-gray-500 italic p-4 bg-gray-50 rounded border">No year-wise data available.</div>
            )}
          </div>
        </div>

        {/* Section-wise Students */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Students by Section</h2>
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
            {data.section_wise_students?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Section</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Batch</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Students</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.section_wise_students.map((sectionData) => (
                      <tr key={sectionData.section_id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{sectionData.section_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{sectionData.batch_name}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-700 text-right">{sectionData.student_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-500 italic bg-gray-50">No section-wise data available.</div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
