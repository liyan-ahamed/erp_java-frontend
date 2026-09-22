'use client';

import { useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';

export const Header = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  
  // Format pathname for header title (e.g. /dashboard/schedule/deadline -> Schedule Deadline)
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 1) {
      // Just take the last part and capitalize
      const lastPart = parts[parts.length - 1];
      return lastPart.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    return 'Overview';
  };

  return (
    <header className="h-[72px] bg-white border-b border-[#E8E8E8] flex items-center justify-between px-8 sticky top-0 z-20 transition-all">
      <div className="flex items-center flex-1 space-x-6">
        <h1 className="text-xl font-bold text-[#111111]">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-3 cursor-pointer hover:bg-[#FAFAFA] p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-[#E8E8E8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`https://ui-avatars.com/api/?name=${user.name}&background=fafafa&color=111111`} 
              alt={user.name} 
              className="w-8 h-8 rounded-full border border-[#E8E8E8]"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#FAFAFA] border border-[#E8E8E8] flex items-center justify-center text-sm font-medium text-[#9A9A9A]">
            ?
          </div>
        )}
      </div>
    </header>
  );
};
