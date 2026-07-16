import { PageContainer } from '@/components/common/PageContainer';

export default function DashboardPage() {
  return (
    <PageContainer title="Dashboard" description="Welcome to the Generic ERP System">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Overview</h3>
          <p className="text-gray-500 text-sm">Dashboard foundation is set up and ready for modules.</p>
        </div>
      </div>
    </PageContainer>
  );
}
