'use client';

import { ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { ROUTES } from '@/constants/routes';
import { ROLE_LABEL, initialsOf, roleOf } from '@/lib/navigation';
import { Bell, LogOut, Settings } from '@/components/ui/icons';

type Position = { top: number; left?: number; right?: number };

const OPEN_EVENT = 'erp:account-menu-open';

/**
 * The one account menu: Account Settings, Notifications, Log out. Both identity entry points — the sidebar
 * user card and the top-bar avatar — open this same menu. It renders in a portal so the sidebar's overflow
 * can't clip it; Escape, an outside click or choosing an item closes it.
 */
export function AccountMenu({ variant, onNavigate }: { variant: 'sidebar' | 'avatar'; onNavigate?: () => void }) {
  const { user, hasRole, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position>({ top: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const role = ROLE_LABEL[roleOf(hasRole)];

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  }, []);

  const toggle = () => {
    const r = trigger.current?.getBoundingClientRect();
    if (r) {
      setPos(variant === 'avatar'
        ? { top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) }
        : { top: r.bottom + 6, left: r.left });
    }
    // Only one account menu is ever open: tell the other entry point to close.
    if (!open) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: menuId }));
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(true); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !trigger.current?.contains(t)) close();
    };
    const onResize = () => close();
    const onOtherOpen = (e: Event) => { if ((e as CustomEvent<string>).detail !== menuId) close(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onResize);
    window.addEventListener(OPEN_EVENT, onOtherOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener(OPEN_EVENT, onOtherOpen);
    };
  }, [open, close, menuId]);

  const done = () => { close(); onNavigate?.(); };
  const item = 'flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-fg hover:bg-soft focus-visible:bg-soft outline-none [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-muted';

  const triggerBody: ReactNode = variant === 'sidebar' ? (
    <>
      <span className="avatar !w-6 !h-6 !text-[9px]">{initialsOf(user?.name)}</span>
      <span className="min-w-0 flex-1 text-left">
        <strong className="block truncate text-[12px] font-medium">{user?.name}</strong>
        <span className="secondary truncate">{user?.designation || role}</span>
      </span>
    </>
  ) : (
    initialsOf(user?.name)
  );

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${user?.name ?? 'you'}`}
        title={user?.name}
        className={variant === 'sidebar'
          ? 'workspace-card w-[calc(100%-32px)] text-fg hover:bg-soft transition-colors cursor-pointer'
          : 'avatar cursor-pointer hover:ring-2 hover:ring-line-strong transition-shadow'}
      >
        {triggerBody}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label="Account"
          style={{ position: 'fixed', top: pos.top, left: pos.left, right: pos.right }}
          className="z-[200] w-[232px] rounded-[12px] border border-line bg-surface p-1.5 shadow-[var(--shadow)]"
        >
          <div className="px-2.5 pt-1.5 pb-2 mb-1 border-b border-line">
            <div className="text-[13px] font-[550] text-fg truncate">{user?.name}</div>
            <div className="text-[11.5px] text-muted truncate">{user?.email}</div>
            <div className="text-[11px] text-muted mt-0.5">{role}</div>
          </div>
          <Link role="menuitem" href={ROUTES.SETTINGS} className={item} onClick={done}><Settings /> Account Settings</Link>
          <Link role="menuitem" href={ROUTES.NOTIFICATIONS} className={item} onClick={done}><Bell /> Notifications</Link>
          <button role="menuitem" type="button" className={item} onClick={() => { close(); logout(); }}><LogOut /> Log out</button>
        </div>,
        document.body,
      )}
    </>
  );
}
