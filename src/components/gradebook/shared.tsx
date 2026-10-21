import { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { AlertCircle } from '@/components/ui/icons';
import { getApiErrorMessage } from '@/lib/api-error';
import { ASSESSMENT_STATUS_BADGE, PENDING_CALCULATION_TEXT } from '@/lib/gradebook-labels';
import { AssessmentStatus } from '@/types/gradebook';

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="f-label">
      {children}
    </label>
  );
}

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-[13px] text-fg mt-1 break-words">{value}</div>
    </div>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'default'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

export function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  const badge = ASSESSMENT_STATUS_BADGE[status];
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

/** Null internal totals mean "not calculated yet" — never render them as zero. */
export function PendingTotal({ value, outOf }: { value: number | null; outOf?: number }) {
  if (value === null || value === undefined) {
    return <span className="text-[12px] text-muted italic">{PENDING_CALCULATION_TEXT}</span>;
  }
  return (
    <span className="font-[550]">
      {Number(value)}
      {outOf ? <span className="text-muted font-normal"> / {outOf}</span> : null}
    </span>
  );
}

/**
 * Details and forms. Formerly a side panel beside the list; now a Forma dialog. The name and props are
 * unchanged so every page keeps its open/close state and content exactly as before.
 */
export function SidePanel({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <Dialog title={title} onClose={onClose} wide={wide}>
      {children}
    </Dialog>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Spinner size="lg" />
      <p className="text-muted text-[13px]">{label}</p>
    </div>
  );
}

export function EmptyBlock({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="p-10 text-center">
      <div className="flex justify-center mb-3">
        <span className="metric-icon text-muted [&_svg]:!w-[22px] [&_svg]:!h-[22px] !p-[11px] !rounded-[10px]">{icon}</span>
      </div>
      <p className="text-[13px] text-fg">{title}</p>
      {hint && <p className="text-[12px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ error, fallback, title }: { error: unknown; fallback: string; title?: string }) {
  return (
    <div className="flex gap-3 p-[18px] bg-danger-soft text-danger rounded-[15px]" role="alert">
      <AlertCircle className="mt-px" />
      <div>
        {title && <h3 className="font-[550] text-[14px] mb-1">{title}</h3>}
        <p className="text-[13px]">{getApiErrorMessage(error, fallback)}</p>
      </div>
    </div>
  );
}

export function FormError({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className="rounded-[8px] bg-danger-soft p-3 text-[13px] text-danger" role="alert">
      {getApiErrorMessage(error, fallback)}
    </div>
  );
}
