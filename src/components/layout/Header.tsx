'use client';

import { useAuth } from '@/contexts/auth-context';

export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center">
        {/* Mobile menu button could go here */}
      </div>
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-gray-800">{user.name}</span>
              <span className="text-xs text-gray-500">{user.designation}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button 
              onClick={logout}
              className="ml-4 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
            ?
          </div>
        )}
      </div>
    </header>
  );
};
