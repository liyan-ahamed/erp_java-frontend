import { ReactNode } from 'react';
import axios from 'axios';
import { Lock } from 'lucide-react';
import { Badge, BadgeProps } from '@/components/ui/Badge';
import { ApiResponse } from '@/types/api';

// Small building blocks shared by the student ERP module pages. Page states (loading / empty /
// error), side panels and confirmations reuse components/gradebook/shared and portfolio/shared.

export function StatusBadge({ info }: { info: { label: string; variant: BadgeProps['variant'] } }) {
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="p-4 bg-white border border-[#E8E8E8] rounded-[10px]">
      <p className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">{label}</p>
      <div className="text-xl font-bold text-[#111111] mt-1 break-words">{value}</div>
      {hint && <div className="text-[11px] text-[#9A9A9A] mt-0.5">{hint}</div>}
    </div>
  );
}

/** Grey info strip explaining why something is read-only. */
export function ReadOnlyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] bg-[#F5F5F5] border border-[#E8E8E8] p-3 text-sm text-[#666666]">
      <Lock className="w-4 h-4 flex-shrink-0" /> <span>{children}</span>
    </div>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-green-700" role="status">{children}</p>;
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
