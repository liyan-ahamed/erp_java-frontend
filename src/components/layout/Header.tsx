'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/providers/theme-provider';
import { useUnreadCount } from '@/hooks/useNotifications';
import { isGradebookEnabled } from '@/lib/feature-flags';
import { getPageMeta, getSectionLabel, ROLE_LABEL, roleOf } from '@/lib/navigation';
import { AccountMenu } from './AccountMenu';
import { ROUTES } from '@/constants/routes';
import { Bell, Menu, Moon, Sun } from '@/components/ui/icons';

/** Forma top bar: current page / section breadcrumb, role badge, theme toggle, notifications, avatar. */
export const Header = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
  const { hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const role = roleOf(hasRole);
  const { data: unreadCount } = useUnreadCount();
  const { title } = getPageMeta(pathname, role);

  return (
    <header className="topbar">
      <div className="topbar-title">
        <button type="button" onClick={onOpenMenu} className="f-btn icon mobile-menu" aria-label="Open navigation">
          <Menu />
        </button>
        {/* Section first, then the page: "Teaching / Assessments". */}
        <span className="crumb">{getSectionLabel(pathname, role, isGradebookEnabled())} /</span>
        <span className="truncate">{title}</span>
      </div>
      <div className="topbar-right">
        <span className="badge role-label">{ROLE_LABEL[role]} workspace</span>
        <button
          type="button"
          onClick={toggleTheme}
          className="f-btn icon"
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          {theme === 'light' ? <Sun /> : <Moon />}
        </button>
        <Link
          href={ROUTES.NOTIFICATIONS}
          className="f-btn icon relative"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell />
          {!!unreadCount && <span className="notification-dot" aria-hidden />}
        </Link>
        <span className="topbar-sep" />
        <AccountMenu variant="avatar" />
      </div>
    </header>
  );
};
