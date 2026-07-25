'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useSchedules } from '@/hooks/useSchedule';
import { ScheduleList } from '@/components/schedule/ScheduleList';
import { Loader2 } from 'lucide-react';

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
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Meetings</h1>
        <p className="text-slate-500 font-medium">View your upcoming scheduled meetings</p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <span className="text-sm font-medium">Loading meetings...</span>
        </div>
      ) : (
        <ScheduleList schedules={schedules} showDelete={false} />
      )}
    </div>
  );
}
