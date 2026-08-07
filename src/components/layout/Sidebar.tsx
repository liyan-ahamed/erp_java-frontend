'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LayoutDashboard, GraduationCap, ChevronDown, ChevronLeft, Calendar, Clock, Bell, Shield } from 'lucide-react';

export const Sidebar = () => {
  const { user, hasRole, logout } = useAuth();
  const pathname = usePathname();
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(
    pathname.includes('/attendance')
  );

  return (
    <aside
      className="w-64 md:w-72 h-screen flex flex-col fixed left-0 top-0 z-30 p-4 justify-between select-none text-[#111111] bg-white border-r border-[#E8E8E8]"
    >
      <div className="flex flex-col space-y-6 overflow-y-auto pr-1">
        {/* Top Logo Header */}
        <div className="flex items-center space-x-3 px-2 py-2">
          <div className="w-10 h-10 flex items-center justify-center text-white bg-[#111111] rounded-xl shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold tracking-tight text-[#111111] leading-none mb-1">Dept. ERP</h1>
            <span className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider leading-none">Management System</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col space-y-1">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`flex items-center px-3 py-2.5 rounded-[10px] font-medium text-sm transition-colors ${
              pathname === '/dashboard'
                ? 'bg-[#FAFAFA] text-[#111111]'
                : 'text-[#666666] hover:bg-[#FAFAFA] hover:text-[#111111]'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${
              pathname === '/dashboard' ? 'text-[#111111]' : 'text-[#666666]'
            }`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="tracking-wide">Dashboard</span>
          </Link>

          {/* Attendance (expandable) */}
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => setIsAttendanceOpen(!isAttendanceOpen)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-[10px] font-medium text-sm transition-colors w-full ${
                pathname.includes('/attendance')
                  ? 'bg-[#FAFAFA] text-[#111111]'
                  : 'text-[#666666] hover:bg-[#FAFAFA] hover:text-[#111111]'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${
                  pathname.includes('/attendance') ? 'text-[#111111]' : 'text-[#666666]'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className="tracking-wide">Attendance</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isAttendanceOpen ? 'rotate-180 text-[#111111]' : 'text-[#9A9A9A]'}`} />
            </button>

            {isAttendanceOpen && (
              <div className="flex flex-col pl-14 pr-2 space-y-1 mt-1">
                <Link
                  href="/dashboard/attendance"
                  className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                    pathname === '/dashboard/attendance'
                      ? 'text-[#111111] bg-[#FAFAFA]'
                      : 'text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA]'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  href="/dashboard/attendance/analytics"
                  className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                    pathname === '/dashboard/attendance/analytics'
                      ? 'text-[#111111] bg-[#FAFAFA]'
                      : 'text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA]'
                  }`}
                >
                  Analytics
                </Link>
              </div>
            )}
          </div>

          {/* HOD: Set Schedule */}
          {hasRole('ROLE_HOD') && (
            <Link
              href="/dashboard/schedule/set-schedule"
              className={`flex items-center px-3 py-2.5 rounded-[10px] font-medium text-sm transition-colors ${
                pathname.includes('/schedule/set-schedule')
                  ? 'bg-[#FAFAFA] text-[#111111]'
                  : 'text-[#666666] hover:bg-[#FAFAFA] hover:text-[#111111]'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${
                pathname.includes('/schedule/set-schedule') ? 'text-[#111111]' : 'text-[#666666]'
              }`}>
                <Calendar className="w-5 h-5" />
              </div>
              <span className="tracking-wide">Set Schedule</span>
            </Link>
          )}

          {/* STAFF: Schedule submenu */}
          {hasRole('ROLE_STAFF') && (
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                className="flex items-center justify-between px-3 py-2.5 rounded-[10px] font-medium text-sm transition-colors text-[#666666] hover:bg-[#FAFAFA] hover:text-[#111111] w-full"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-[#666666]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="tracking-wide">Schedule</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isScheduleOpen ? 'rotate-180 text-[#111111]' : 'text-[#9A9A9A]'}`} />
              </button>
              
              {isScheduleOpen && (
                <div className="flex flex-col pl-14 pr-2 space-y-1 mt-1">
                  <Link
                    href="/dashboard/schedule/deadline"
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                      pathname.includes('/schedule/deadline') 
                        ? 'text-[#111111] bg-[#FAFAFA]' 
                        : 'text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA]'
                    }`}
                  >
                    Deadline
                  </Link>
                  <Link
                    href="/dashboard/schedule/meetings"
                    className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                      pathname.includes('/schedule/meetings') 
                        ? 'text-[#111111] bg-[#FAFAFA]' 
                        : 'text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA]'
                    }`}
                  >
                    Meetings
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <Link
            href="/dashboard/notifications"
            className={`flex items-center px-3 py-2.5 rounded-[10px] font-medium text-sm transition-colors ${
              pathname.includes('/notifications')
                ? 'bg-[#FAFAFA] text-[#111111]'
                : 'text-[#666666] hover:bg-[#FAFAFA] hover:text-[#111111]'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${
              pathname.includes('/notifications') ? 'text-[#111111]' : 'text-[#666666]'
            }`}>
              <Bell className="w-5 h-5" />
            </div>
            <span className="tracking-wide">Notifications</span>
          </Link>

          {/* Audit Log — HOD only */}
          {hasRole('ROLE_HOD') && (
            <Link
              href="/dashboard/audit-log"
              className={`flex items-center px-3 py-2.5 rounded-[10px] font-medium text-sm transition-colors ${
                pathname.includes('/audit-log')
                  ? 'bg-[#FAFAFA] text-[#111111]'
                  : 'text-[#666666] hover:bg-[#FAFAFA] hover:text-[#111111]'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${
                pathname.includes('/audit-log') ? 'text-[#111111]' : 'text-[#666666]'
              }`}>
                <Shield className="w-5 h-5" />
              </div>
              <span className="tracking-wide">Audit Log</span>
            </Link>
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="pt-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 rounded-[10px] px-2 py-2 flex-1 mr-1 hover:bg-[#FAFAFA] transition-colors cursor-pointer border border-transparent hover:border-[#E8E8E8]">
          <div className="w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center text-[#111111] font-bold text-sm border border-[#E8E8E8]">
            {user?.name ? user.name.charAt(0) : 'D'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold text-[#111111] truncate">{user?.name || 'Dr Kumar'}</span>
            <span className="text-xs text-[#9A9A9A] truncate">{user?.designation || 'HOD'}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-[#9A9A9A]" />
        </div>
        <button onClick={logout} className="w-9 h-9 flex items-center justify-center text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA] rounded-[10px] transition-all border border-transparent hover:border-[#E8E8E8]" title="Logout">
          <ChevronLeft className="w-4.5 h-4.5" />
        </button>
      </div>
    </aside>
  );
};
