'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Award, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DetailField, EmptyBlock, ErrorBanner, LoadingBlock } from '@/components/gradebook/shared';
import { EvidenceLink, PortfolioStatusBadge, dateRange, httpStatus } from '@/components/portfolio/shared';
import { useStudentPortfolio } from '@/hooks/usePortfolio';
import { ROUTES } from '@/constants/routes';
import { SELECT_CLASS, formatDateTime } from '@/lib/gradebook-labels';
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, LEVEL_LABELS } from '@/lib/portfolio-labels';
import { PortfolioEntry } from '@/types/portfolio';

type Grouping = 'type' | 'year';

function VerifiedEntryCard({ entry }: { entry: PortfolioEntry }) {
  return (
    <div className="border border-[#F0F0F0] rounded-[12px] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-[#111111] break-words">{entry.title}</p>
          <p className="text-xs text-[#666666]">
            {entry.organization || '—'} · {dateRange(entry)}
          </p>
        </div>
        <PortfolioStatusBadge status={entry.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{ACTIVITY_TYPE_LABELS[entry.activityType]}</Badge>
        {entry.level && <Badge variant="outline">{LEVEL_LABELS[entry.level]}</Badge>}
        {entry.achievementResult && <Badge variant="info">{entry.achievementResult}</Badge>}
      </div>
      {entry.description && <p className="text-sm text-[#444444] whitespace-pre-wrap">{entry.description}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailField label="Role / Position" value={entry.roleOrPosition || '—'} />
        <DetailField label="Verified" value={`${formatDateTime(entry.reviewedAt)}${entry.reviewedByName ? ` · ${entry.reviewedByName}` : ''}`} />
      </div>
      <DetailField label="Evidence" value={<EvidenceLink url={entry.evidenceUrl} />} />
    </div>
  );
}

function StudentPortfolioView() {
  const params = useParams<{ studentId: string }>();
  const parsed = Number(params.studentId);
  const studentId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const { data, isLoading, isError, error } = useStudentPortfolio(studentId);
  const [grouping, setGrouping] = useState<Grouping>('type');

  // Grouping only rearranges the complete list the backend returned (not paged).
  const groups = useMemo(() => {
    if (!data) return [];
    if (grouping === 'type') {
      return ACTIVITY_TYPES.map((type) => ({
        key: type,
        label: ACTIVITY_TYPE_LABELS[type],
        entries: data.entries.filter((e) => e.activityType === type),
      })).filter((g) => g.entries.length > 0);
    }
    const byYear = new Map<string, PortfolioEntry[]>();
    data.entries.forEach((e) => {
      const year = e.startDate ? e.startDate.slice(0, 4) : 'No date';
      byYear.set(year, [...(byYear.get(year) ?? []), e]);
    });
    return [...byYear.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, entries]) => ({ key: year, label: year, entries }));
  }, [data, grouping]);

  const back = (
    <Link href={ROUTES.PORTFOLIO_REVIEW} className="inline-flex items-center text-sm text-[#666666] hover:text-[#111111]">
      <ArrowLeft className="w-4 h-4 mr-1" /> Back to Review Queue
    </Link>
  );

  if (studentId === null) {
    return <PageContainer contextArea={back}><ErrorBanner error={new Error('Invalid student id.')} fallback="Invalid student id." /></PageContainer>;
  }

  return (
    <PageContainer contextArea={back} rawLayout={true}>
      {isLoading ? (
        <Card><LoadingBlock label="Loading portfolio..." /></Card>
      ) : isError ? (
        <div className="space-y-3">
          {httpStatus(error) === 403 && (
            <div className="flex items-center gap-2 text-sm font-semibold text-[#111111]">
              <ShieldAlert className="w-4 h-4" aria-hidden /> Access denied
            </div>
          )}
          <ErrorBanner error={error} fallback="Unable to load this student's portfolio." />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#111111]">{data.studentName}</h2>
                <p className="text-sm text-[#666666]">
                  <span className="font-mono">{data.registerNumber || '—'}</span> · {data.batchName} · Section {data.sectionName}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-2xl font-bold text-[#111111]">{data.verifiedCount}</p>
                <p className="text-xs text-[#9A9A9A] uppercase tracking-wider font-semibold">Verified achievements</p>
              </div>
            </CardContent>
          </Card>

          {data.entries.length === 0 ? (
            <Card><EmptyBlock icon={<Award className="w-10 h-10" />} title="No verified achievements yet." /></Card>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <label htmlFor="grouping" className="text-sm text-[#666666]">Group by</label>
                <select id="grouping" value={grouping} onChange={(e) => setGrouping(e.target.value as Grouping)} className={SELECT_CLASS}>
                  <option value="type">Activity type</option>
                  <option value="year">Year</option>
                </select>
                <span className="text-xs text-[#9A9A9A]">Only verified entries are shown.</span>
              </div>
              {groups.map((group) => (
                <Card key={group.key}>
                  <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#111111]">{group.label}</h3>
                    <Badge>{group.entries.length}</Badge>
                  </div>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                    {group.entries.map((entry) => <VerifiedEntryCard key={entry.id} entry={entry} />)}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      ) : null}
    </PageContainer>
  );
}

export default function StudentPortfolioPage() {
  return (
    <RequireRole roles={['ROLE_STAFF', 'ROLE_HOD']}>
      <StudentPortfolioView />
    </RequireRole>
  );
}
