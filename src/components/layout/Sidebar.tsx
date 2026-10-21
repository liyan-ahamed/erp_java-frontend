'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { isGradebookEnabled } from '@/lib/feature-flags';
import { buildNav, isActive, NavItem, NOTIFICATIONS_ITEM, roleOf } from '@/lib/navigation';
import { AccountMenu } from './AccountMenu';
import { GraduationCap, LogOut, Menu } from '@/components/ui/icons';

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const active = isActive(pathname, item.href, item.exact);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`nav-item ${active ? 'active' : ''}`}
    >
      <item.icon />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

interface SidebarProps {
  /** Closes the phone drawer after navigating; harmless on desktop. */
  onClose: () => void;
}

/** Forma sidebar: brand, signed-in user card, grouped navigation, pinned bottom controls. */
export const Sidebar = ({ onClose }: SidebarProps) => {
  const { hasRole, logout } = useAuth();
  const pathname = usePathname();
  const role = roleOf(hasRole);
  const { main, admin } = buildNav(role, isGradebookEnabled());

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <span className="brand-mark">
          <GraduationCap />
        </span>
        Dept. ERP
        <button
          type="button"
          onClick={onClose}
          className="mobile-menu ml-auto w-[25px] h-[25px] p-1 items-center justify-center rounded-md text-muted hover:bg-soft"
          aria-label="Close navigation"
        >
          <Menu />
        </button>
      </div>

      {/* The signed-in user card opens the shared account menu (same menu as the top-bar avatar). */}
      <AccountMenu variant="sidebar" onNavigate={onClose} />

      <nav className="nav">
        {main.map((section) => (
          <div key={section.label || 'top'}>
            {section.label && <div className="nav-label">{section.label}</div>}
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onClose} />
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {admin.length > 0 && (
          <>
            <div className="nav-label !mt-1">Administration</div>
            {admin.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onClose} />
            ))}
          </>
        )}
        <NavLink item={NOTIFICATIONS_ITEM} pathname={pathname} onNavigate={onClose} />
        <button type="button" onClick={logout} className="nav-item">
          <LogOut />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};
