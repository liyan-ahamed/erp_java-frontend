'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export const Sidebar = () => {
  const { hasRole } = useAuth();
  const isHod = hasRole('ROLE_HOD');

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col fixed left-0 top-0 z-30 transition-transform transform">
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-wider">ERP SYSTEM</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          <li>
            <Link 
              href="/"
              className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              href="/students"
              className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Students
            </Link>
          </li>
          <li>
            <Link 
              href="/batches"
              className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Batches
            </Link>
          </li>
          <li>
            <Link 
              href="/sections"
              className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Sections
            </Link>
          </li>

          {isHod && (
            <>
              <li>
                <Link 
                  href="/staff"
                  className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  Staff
                </Link>
              </li>
              <li>
                <Link 
                  href="/settings"
                  className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  Settings
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          &copy; {new Date().getFullYear()} Generic ERP
        </div>
      </div>
    </aside>
  );
};
