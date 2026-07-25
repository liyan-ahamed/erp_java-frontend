'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LayoutDashboard, GraduationCap, ChevronDown, ChevronLeft } from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const pathname = usePathname();

  const sidebarGlassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    borderRight: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: '10px 0 30px rgba(0, 0, 0, 0.05)',
  };

  const pillGlassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1.5px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  };

  const iconGlassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1.5px solid rgba(255, 255, 255, 0.7)',
    boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.4)',
  };

  return (
    <aside
      className="w-72 h-screen flex flex-col fixed left-0 top-0 z-30 p-4 justify-between select-none text-slate-800"
      style={sidebarGlassStyle}
    >
      <div className="flex flex-col space-y-6 overflow-y-auto pr-1">
        {/* Top Logo Header */}
        <div className="flex items-center space-x-3.5 px-3 py-2">
          <div className="w-11 h-11 flex items-center justify-center text-slate-800 rounded-2xl" style={iconGlassStyle}>
            <GraduationCap className="w-6 h-6 text-slate-800" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold tracking-tight text-slate-800 leading-tight">Dept. ERP</h1>
            <span className="text-[11px] font-medium text-slate-500">Management System</span>
          </div>
        </div>

        {/* Active Dashboard Link */}
        <Link
          href="/dashboard"
          className="flex items-center px-4 py-3 rounded-2xl text-slate-800 font-semibold text-base transition-all hover:opacity-90"
          style={pillGlassStyle}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mr-3" style={iconGlassStyle}>
            <LayoutDashboard className="w-5 h-5 text-slate-800" />
          </div>
          <span className="tracking-wide">Dashboard</span>
        </Link>
      </div>

      {/* User Profile Footer */}
      <div className="pt-3 border-t border-slate-400/20 flex items-center justify-between">
        <div className="flex items-center space-x-3 rounded-2xl px-3.5 py-2.5 flex-1 mr-2" style={iconGlassStyle}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user?.name ? user.name.charAt(0) : 'D'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-800 truncate">{user?.name || 'Dr Kumar'}</span>
            <span className="text-[10px] text-slate-500 truncate">{user?.designation || 'HOD'}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
        <button className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all" style={iconGlassStyle}>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
