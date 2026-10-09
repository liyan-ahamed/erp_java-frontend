import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { ASSESSMENT_STATUS_BADGE, PENDING_CALCULATION_TEXT } from '@/lib/gradebook-labels';
import { AssessmentStatus } from '@/types/gradebook';

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">
      {children}
    </label>
  );
}

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="text-sm text-[#111111] mt-1 break-words">{value}</div>
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
    return <span className="text-xs font-medium text-[#9A9A9A] italic">{PENDING_CALCULATION_TEXT}</span>;
  }
  return (
    <span className="font-semibold">
      {Number(value)}
      {outOf ? <span className="text-[#9A9A9A] font-normal"> / {outOf}</span> : null}
    </span>
  );
}

/** Side panel used for details and forms, matching the Users / Audit Log pages. */
export function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="w-full lg:w-[420px] flex-shrink-0">
      <Card className="lg:sticky lg:top-4">
        <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#111111]">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#9A9A9A] hover:text-[#111111] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Spinner size="lg" />
      <p className="text-[#666666] font-medium text-sm">{label}</p>
    </div>
  );
}

export function EmptyBlock({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="p-12 text-center">
      <div className="flex justify-center text-[#D4D4D4] mb-3">{icon}</div>
      <p className="text-sm font-medium text-[#666666]">{title}</p>
      {hint && <p className="text-xs text-[#9A9A9A] mt-1">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ error, fallback, title }: { error: unknown; fallback: string; title?: string }) {
  return (
    <div className="p-5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
      {title && <h3 className="font-bold text-sm mb-1 text-[#DC2626]">{title}</h3>}
      <p className="text-sm text-[#DC2626]">{getApiErrorMessage(error, fallback)}</p>
    </div>
  );
}

export function FormError({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className="rounded-[10px] bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
      {getApiErrorMessage(error, fallback)}
    </div>
  );
}
