'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ASSESSMENT_TYPE_LABELS, formatDateTime } from '@/lib/gradebook-labels';
import { Assessment, AssessmentType } from '@/types/gradebook';

/** "25 Sept" — short dates for assessment tables and cards (the year is in the semester context). */
export const shortDate = (value: string | null | undefined) =>
  value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

/** "25 Sept 2026". */
export const longDate = (value: string | null | undefined) =>
  value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const typeLabel = (t: AssessmentType) => ASSESSMENT_TYPE_LABELS[t] ?? t;

/** Small grey chip with the assessment type, e.g. "Quiz". */
export function TypeChip({ type }: { type: AssessmentType }) {
  return <span className="inline-flex items-center rounded-[6px] bg-soft border border-line px-1.5 py-px text-[10.5px] text-muted whitespace-nowrap">{typeLabel(type)}</span>;
}

/** Draft (orange) / Finalized (green). Hovering a finalized chip shows when it was finalized. */
export function StatusChip({ assessment }: { assessment: Pick<Assessment, 'status' | 'finalizedAt'> }) {
  return assessment.status === 'FINALIZED' ? (
    <Badge variant="success" title={assessment.finalizedAt ? `Finalized ${formatDateTime(assessment.finalizedAt)} — marks are locked` : 'Finalized — marks are locked'}>
      Finalized
    </Badge>
  ) : (
    <Badge variant="warning">Draft</Badge>
  );
}

export function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value * 100) / total)) : 0;
  return (
    <div className="progress flex-1" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>
      <span style={{ width: `${pct}%`, background: 'var(--orange-text)' }} />
    </div>
  );
}

export interface MenuAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  /** Shown disabled with this reason as its tooltip. */
  disabledReason?: string;
}

/** "⋯" button with a small menu. Closes on outside click and Escape; arrow keys move between items. */
export function RowMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        className="f-btn icon ghost !w-8 !h-8 text-muted"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden className="text-[15px] leading-none tracking-[1px]">⋯</span>
      </button>
      {open && (
        <div role="menu" onKeyDown={onMenuKey}
          className="absolute right-0 top-9 z-30 min-w-40 rounded-[10px] border border-line bg-surface p-1 shadow-[var(--shadow)]">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              disabled={!!a.disabledReason}
              title={a.disabledReason}
              onClick={() => { setOpen(false); a.onSelect(); }}
              className={`block w-full text-left px-3 py-2 rounded-[7px] text-[12.5px] hover:bg-soft focus:bg-soft focus:outline-none disabled:opacity-45 disabled:cursor-not-allowed ${a.danger ? 'text-danger' : 'text-fg'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Confirmation in a Forma dialog (no browser confirm()). */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger,
  isLoading,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="space-y-4 text-[13px] text-fg">
        {children}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </div>
      </div>
    </Dialog>
  );
}
