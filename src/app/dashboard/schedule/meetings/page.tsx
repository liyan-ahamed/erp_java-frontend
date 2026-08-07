'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useSchedules } from '@/hooks/useSchedule';
import { ScheduleList } from '@/components/schedule/ScheduleList';
import { PageContainer } from '@/components/common/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function MeetingsPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  
  const { data: schedules = [], isLoading } = useSchedules('MEETING');

  useEffect(() => {
    if (!hasRole('ROLE_STAFF')) {
      router.push('/dashboard');
    }
  }, [hasRole, router]);

  if (!hasRole('ROLE_STAFF')) return null;

  return (
    <PageContainer title="Meetings" description="View your upcoming scheduled meetings">
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-[#666666] flex flex-col items-center justify-center space-y-4">
              <Spinner size="lg" />
              <span className="text-sm font-medium">Loading meetings...</span>
            </div>
          ) : (
            <ScheduleList schedules={schedules} showDelete={false} />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
