'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ROUTES } from '@/constants/routes';
import { Spinner } from '../ui/Spinner';
import { Calendar } from '../ui/icons';
import { ROLE_LABEL, roleOf } from '@/lib/navigation';

interface AppLayoutProps {
  children: ReactNode;
}

const today = () =>
  new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Forma inset shell. Only `.main` scrolls; the sidebar and its bottom controls stay in place. */
export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, hasRole, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Phones only: the sidebar is a drawer opened from the top bar.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== ROUTES.LOGIN) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMenuOpen, closeMenu]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <div className="text-muted text-[13px]">Loading your workspace…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`shell ${isMenuOpen ? 'menu-open' : ''}`}>
      <div className="drawer-backdrop" onClick={closeMenu} aria-hidden />
      <Sidebar onClose={closeMenu} />

      <main className="main">
        <Header onOpenMenu={() => setIsMenuOpen(true)} />
        <div className="content">
          <div className="utility">
            <Calendar className="w-[15px] h-[15px]" /> {today()}
          </div>
          {children}
          <div className="footer-note">
            <span>
              <span className="status-dot" />
              Department ERP
            </span>
            <span className="truncate">
              {user?.name} · {ROLE_LABEL[roleOf(hasRole)]} workspace
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
