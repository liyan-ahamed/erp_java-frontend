'use client';

import { useAuth } from '@/contexts/auth-context';
import { Bell, Search, Sun } from 'lucide-react';
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
        
        {/* Search Bar */}
        <div className="hidden md:flex items-center justify-between text-[#9A9A9A] bg-white px-4 py-2 rounded-full border border-[#E8E8E8] w-64 hover:border-[#D4D4D4] transition-colors cursor-pointer shadow-sm">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-[#666666]" />
            <span className="text-sm">Search</span>
          </div>
          <div className="text-[10px] font-medium bg-[#FAFAFA] text-[#666666] px-2 py-0.5 rounded border border-[#E8E8E8]">
            Ctrl+K
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-[#666666] hover:text-[#111111] transition-colors w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#FAFAFA] border border-[#E8E8E8] shadow-sm">
          <Sun className="w-4.5 h-4.5" />
        </button>
        <button className="text-[#666666] hover:text-[#111111] transition-colors relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#FAFAFA] border border-[#E8E8E8] shadow-sm">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="h-6 w-px bg-[#E8E8E8] mx-2"></div>
        
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
