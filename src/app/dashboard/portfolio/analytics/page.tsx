'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, BarChart3, CheckCircle2, Clock, Users } from '@/components/ui/icons';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, LoadingBlock } from '@/components/gradebook/shared';
import { usePortfolioSummary } from '@/hooks/usePortfolio';
import { isPortfolioAnalyticsEnabled } from '@/lib/feature-flags';
import { ROUTES } from '@/constants/routes';
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, LEVELS, LEVEL_LABELS } from '@/lib/portfolio-labels';

/** A breakdown table with a proportional bar; the number is always shown as text. */
function Breakdown({ title, rows }: { title: string; rows: { key: string; label: ReactNode; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <div className="px-6 py-4 border-b border-line">
        <h3 className="text-sm font-[550] text-fg">{title}</h3>
        <p className="text-xs text-muted">Verified entries</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-6 text-sm text-muted">No data.</p>
      ) : (
        <Table>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="w-2/5">{r.label}</TableCell>
                <TableCell>
                  <div className="h-2 rounded-full bg-soft overflow-hidden" aria-hidden>
                    <div className="h-full bg-fg rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
                  </div>
                </TableCell>
                <TableCell className="w-12 text-right font-[550]">{r.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function AnalyticsView() {
  const { data, isLoading, isError, error } = usePortfolioSummary();

  if (isLoading) return <PageContainer><Card><LoadingBlock label="Loading portfolio summary..." /></Card></PageContainer>;
  if (isError || !data) {
    return <PageContainer><ErrorBanner error={error} fallback="Unable to load portfolio summary." title="Error Loading Summary" /></PageContainer>;
  }

  // Entries the backend counts here (drafts are private and never included).
  const reviewed = data.verified + data.pendingReview + data.rejected;
  const scopeNote =
    data.scope === 'DEPARTMENT'
      ? 'Whole department. Drafts are private to students and not counted.'
      : 'Students in the sections you currently teach. Drafts are private to students and not counted.';

  return (
    <PageContainer rawLayout={true}>
      <p className="text-sm text-muted mb-4">{scopeNote}</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard title="Total Entries" value={reviewed} icon={<BarChart3 className="w-4 h-4" />} subtitle="Submitted, verified or rejected" />
        <MetricCard title="Verified" value={data.verified} icon={<CheckCircle2 className="w-4 h-4" />} />
        <MetricCard title="Pending Review" value={data.pendingReview} icon={<Clock className="w-4 h-4" />} />
        <MetricCard title="Rejected" value={data.rejected} icon={<AlertCircle className="w-4 h-4" />} subtitle="Awaiting student changes" />
        <MetricCard title="Students" value={data.studentsWithVerifiedEntries} icon={<Users className="w-4 h-4" />} subtitle="With a verified entry" />
      </div>

      {reviewed === 0 ? (
        <Card><EmptyBlock icon={<BarChart3 className="w-10 h-10" />} title="No portfolio data available yet." /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Breakdown
            title="By Activity Type"
            rows={ACTIVITY_TYPES.map((t) => ({ key: t, label: ACTIVITY_TYPE_LABELS[t], count: data.verifiedByActivityType[t] ?? 0 }))}
          />
          <Breakdown
            title="By Level"
            rows={LEVELS.map((l) => ({ key: l, label: LEVEL_LABELS[l], count: data.verifiedByLevel[l] ?? 0 }))}
          />
          <Breakdown
            title="By Batch"
            rows={data.verifiedByBatch.map((b) => ({
              key: String(b.batchId),
              label: (
                <span>
                  {b.batchName}
                  {b.currentYear ? <span className="text-xs text-muted"> · Year {b.currentYear}</span> : null}
                </span>
              ),
              count: b.verified,
            }))}
          />
          <Card>
            <div className="px-6 py-4 border-b border-line">
              <h3 className="text-sm font-[550] text-fg">By Section</h3>
              <p className="text-xs text-muted">Verified entries</p>
            </div>
            {data.verifiedBySection.length === 0 ? (
              <p className="px-6 py-6 text-sm text-muted">No data.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-right">Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.verifiedBySection.map((s) => (
                    <TableRow key={s.sectionId}>
                      <TableCell>{s.batchName}</TableCell>
                      <TableCell>{s.sectionName}</TableCell>
                      <TableCell className="text-right font-[550]">{s.verified}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </PageContainer>
  );
}

/** Analytics is switched off by a frontend flag: redirect without mounting the view, so no analytics API runs. */
function AnalyticsDisabled() {
  const router = useRouter();
  useEffect(() => router.replace(ROUTES.PORTFOLIO_REVIEW), [router]);
  return null;
}

export default function PortfolioAnalyticsPage() {
  if (!isPortfolioAnalyticsEnabled()) return <AnalyticsDisabled />;
  return (
    <RequireRole roles={['ROLE_STAFF', 'ROLE_HOD']}>
      <AnalyticsView />
    </RequireRole>
  );
}
