'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
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
  // Phones only: the sidebar is an off-canvas menu opened from the header.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

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
      <Sidebar isOpen={isMenuOpen} onClose={closeMenu} />

      <div className="flex flex-col flex-1 w-full min-w-0 md:pl-72 h-screen overflow-y-auto relative z-10">
        <Header onOpenMenu={() => setIsMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-8 w-full min-w-0 mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
