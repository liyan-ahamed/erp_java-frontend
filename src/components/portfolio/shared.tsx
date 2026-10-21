import { ReactNode } from 'react';
import axios from 'axios';
import { CheckCircle2, Clock, ExternalLink, FileEdit, Lock, AlertCircle } from '@/components/ui/icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DetailField } from '@/components/gradebook/shared';
import { formatDate, formatDateTime } from '@/lib/gradebook-labels';
import { ACTIVITY_TYPE_LABELS, LEVEL_LABELS, PORTFOLIO_STATUS_BADGE, isWebUrl } from '@/lib/portfolio-labels';
import { PortfolioEntry, PortfolioStatus } from '@/types/portfolio';

const STATUS_ICONS: Record<PortfolioStatus, ReactNode> = {
  DRAFT: <FileEdit className="w-3 h-3" aria-hidden />,
  SUBMITTED: <Clock className="w-3 h-3" aria-hidden />,
  VERIFIED: <CheckCircle2 className="w-3 h-3" aria-hidden />,
  REJECTED: <AlertCircle className="w-3 h-3" aria-hidden />,
};

/** Status shown with an icon and a text label, never by colour alone. */
export function PortfolioStatusBadge({ status }: { status: PortfolioStatus }) {
  const badge = PORTFOLIO_STATUS_BADGE[status];
  return (
    <Badge variant={badge.variant} className="gap-1 whitespace-nowrap">
      {STATUS_ICONS[status]}
      {badge.label}
    </Badge>
  );
}

/** Evidence is a link only (no uploads). Opened in a new tab, never embedded. */
export function EvidenceLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-muted italic">No evidence provided</span>;
  if (!isWebUrl(url)) return <span className="break-all">{url}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-1 text-accent hover:underline break-all"
    >
      {url}
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export const dateRange = (entry: Pick<PortfolioEntry, 'startDate' | 'endDate'>) => {
  if (!entry.startDate) return '—';
  if (!entry.endDate || entry.endDate === entry.startDate) return formatDate(entry.startDate);
  return `${formatDate(entry.startDate)} – ${formatDate(entry.endDate)}`;
};

const orDash = (value: string | null) => value || '—';

/** Student identity and class, for reviewer-facing views. */
export function StudentIdentity({ entry }: { entry: PortfolioEntry }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <DetailField label="Student" value={entry.studentName} />
      <DetailField label="Register Number" value={orDash(entry.registerNumber)} />
      <DetailField label="Batch" value={entry.batchName} />
      <DetailField label="Section" value={entry.sectionName} />
    </div>
  );
}

/** The student-owned content of an entry. */
export function EntryContent({ entry }: { entry: PortfolioEntry }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Activity Type" value={ACTIVITY_TYPE_LABELS[entry.activityType]} />
        <DetailField label="Level" value={entry.level ? LEVEL_LABELS[entry.level] : '—'} />
        <DetailField label="Organization" value={orDash(entry.organization)} />
        <DetailField label="Role / Position" value={orDash(entry.roleOrPosition)} />
        <DetailField label="Achievement / Result" value={orDash(entry.achievementResult)} />
        <DetailField label="Dates" value={dateRange(entry)} />
      </div>
      <DetailField
        label="Description"
        value={entry.description ? <p className="whitespace-pre-wrap">{entry.description}</p> : '—'}
      />
      <DetailField label="Evidence" value={<EvidenceLink url={entry.evidenceUrl} />} />
    </div>
  );
}

/**
 * Submission and latest decision. On a SUBMITTED entry the review fields belong to an earlier
 * rejection (the backend keeps them until the next decision), so they are labelled that way.
 */
export function ReviewInfo({ entry }: { entry: PortfolioEntry }) {
  const hasDecision = !!entry.reviewedAt;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Submitted" value={formatDateTime(entry.submittedAt)} />
        <DetailField label="Last Updated" value={formatDateTime(entry.updatedAt)} />
      </div>

      {entry.status === 'VERIFIED' && (
        <div className="rounded-[10px] border border-ok/25 bg-ok-soft p-3 text-sm text-ok space-y-1">
          <p className="font-[550] flex items-center gap-1.5">
            <Lock className="w-4 h-4" aria-hidden /> Verified — permanent portfolio record
          </p>
          <p>
            By {entry.reviewedByName || 'a reviewer'} on {formatDateTime(entry.reviewedAt)}
          </p>
          {entry.reviewNote && <p className="whitespace-pre-wrap">Note: {entry.reviewNote}</p>}
        </div>
      )}

      {entry.status === 'REJECTED' && (
        <div className="rounded-[10px] border border-danger/20 bg-danger-soft p-3 text-sm text-danger space-y-1" role="status">
          <p className="font-[550] flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" aria-hidden /> Needs changes
          </p>
          <p>
            Reviewed by {entry.reviewedByName || 'a reviewer'} on {formatDateTime(entry.reviewedAt)}
          </p>
          {entry.reviewNote && <p className="whitespace-pre-wrap">Reason: {entry.reviewNote}</p>}
        </div>
      )}

      {entry.status === 'SUBMITTED' && hasDecision && (
        <div className="rounded-[10px] border border-line bg-soft p-3 text-sm text-muted space-y-1">
          <p className="font-[550] text-fg">Earlier rejection (resubmitted since)</p>
          <p>
            {entry.reviewedByName || 'A reviewer'} on {formatDateTime(entry.reviewedAt)}
          </p>
          {entry.reviewNote && <p className="whitespace-pre-wrap">Reason: {entry.reviewNote}</p>}
        </div>
      )}
    </div>
  );
}

/** Inline confirmation used instead of browser dialogs. */
export function ConfirmBox({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading,
  variant = 'primary',
  children,
}: {
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'danger';
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-line bg-soft p-4 space-y-3" role="alertdialog" aria-label={confirmLabel}>
      <div className="text-[13px] text-fg leading-relaxed">{message}</div>
      {children}
      <div className="flex gap-2">
        <Button size="sm" variant={variant} onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export const httpStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

export const TEXTAREA_CLASS =
  'f-control';
