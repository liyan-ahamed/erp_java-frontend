'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useToast } from '@/providers/toast-provider';
import axios from 'axios';
import { CheckCircle2, Lock } from '@/components/ui/icons';
import { Badge, BadgeProps } from '@/components/ui/Badge';
import { ApiResponse } from '@/types/api';

// Small building blocks shared by the student ERP module pages. Page states (loading / empty /
// error), side panels and confirmations reuse components/gradebook/shared and portfolio/shared.

export function StatusBadge({ info }: { info: { label: string; variant: BadgeProps['variant'] } }) {
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

/** Forma metric tile (label, large value, muted caption). Grids of these keep their page layout. */
export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="metric">
      <div className="metric-top text-fg">{label}</div>
      <div className="metric-value !text-[22px]">{value}</div>
      {hint && <div className="metric-sub">{hint}</div>}
    </div>
  );
}

/** Muted info strip explaining why something is read-only. */
export function ReadOnlyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-[10px] rounded-[12px] bg-soft px-[14px] py-3 text-[12px] text-muted">
      <Lock className="w-4 h-4" /> <span>{children}</span>
    </div>
  );
}

/** Inline success message that stays on screen; the same text is also shown as a Forma toast. */
export function SuccessNote({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const toast = useToast();
  const text = typeof children === 'string' ? children : undefined;
  useEffect(() => {
    const message = ref.current?.textContent?.trim();
    if (message) toast(message);
  }, [toast, text]);
  return (
    <p ref={ref} className="inline-flex items-center gap-2 rounded-[8px] bg-ok-soft text-ok px-3 py-2 text-[12px]" role="status">
      <CheckCircle2 className="w-4 h-4" /> {children}
    </p>
  );
}

/** Wrapper for filter rows in a page's context area. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">{children}</div>;
}

/**
 * Backend bulk-validation errors look like "records[3] (studentId 42): student is not enrolled".
 * Maps them back to students so the affected rows can be highlighted.
 */
export const parseRowErrors = (error: unknown): { message: string; byStudent: Map<number, string>; other: string[] } => {
  const byStudent = new Map<number, string>();
  const other: string[] = [];
  let message = '';
  if (axios.isAxiosError<ApiResponse>(error)) {
    message = error.response?.data?.message ?? '';
    for (const line of error.response?.data?.errors ?? []) {
      const match = line.match(/\(studentId (\d+)\):\s*(.*)$/);
      if (match) byStudent.set(Number(match[1]), match[2]);
      else other.push(line);
    }
  }
  return { message, byStudent, other };
};

/** Display name for a subject offering, built from backend fields only, e.g. "CS301 — Computer Networks — II A". */
export const offeringOptionLabel = (o: {
  subjectCode: string; subjectName: string; batchName?: string; sectionName: string; semester?: number; academicYear?: string;
}) =>
  `${o.subjectCode} — ${o.subjectName} — ${o.batchName ? `${o.batchName} ` : ''}Sec ${o.sectionName}` +
  (o.semester ? ` — Sem ${o.semester}` : '') +
  (o.academicYear ? ` (${o.academicYear})` : '');
