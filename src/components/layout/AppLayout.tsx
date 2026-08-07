'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ROUTES } from '@/constants/routes';
import { Spinner } from '../ui/Spinner';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== ROUTES.LOGIN) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <div className="text-[#666666] text-sm font-medium">Loading ERP System...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex h-screen overflow-hidden text-[#111111] bg-[#FAFAFA]">
      <Sidebar />

      <div className="flex flex-col flex-1 w-full pl-64 md:pl-72 h-screen overflow-y-auto relative z-10">
        <Header />
        <main className="flex-1 p-8 w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
