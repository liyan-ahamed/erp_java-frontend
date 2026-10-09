'use client';

import { useState } from 'react';
import { Award, CheckCircle2, Clock, AlertCircle, Plus, Trophy } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/ui/MetricCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyBlock, ErrorBanner, FormError, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import {
  ConfirmBox,
  EntryContent,
  PortfolioStatusBadge,
  ReviewInfo,
  dateRange,
} from '@/components/portfolio/shared';
import { PortfolioEntryForm } from '@/components/portfolio/PortfolioEntryForm';
import {
  useDeletePortfolioEntry,
  useMyPortfolio,
  useMyPortfolioSummary,
  usePortfolioEntry,
  useSubmitPortfolioEntry,
} from '@/hooks/usePortfolio';
import { SELECT_CLASS } from '@/lib/gradebook-labels';
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  LEVEL_LABELS,
  PORTFOLIO_STATUSES,
  PORTFOLIO_STATUS_BADGE,
} from '@/lib/portfolio-labels';
import { PortfolioActivityType, PortfolioEntry, PortfolioStatus } from '@/types/portfolio';

const PAGE_SIZE = 20;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i);

type Panel = { mode: 'create' } | { mode: 'edit'; entry: PortfolioEntry } | { mode: 'view'; id: number } | null;

const isEditable = (status: PortfolioStatus) => status === 'DRAFT' || status === 'REJECTED';

function SummaryCards() {
  const { data, isError } = useMyPortfolioSummary();
  // Counts come from the backend summary (all pages), never from the visible page.
  if (isError) return null;
  const value = (n: number | undefined) => (n === undefined ? '—' : n);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Total Entries"
        value={value(data?.totalEntries)}
        icon={<Trophy className="w-4 h-4" />}
        subtitle={data ? `${data.draft} draft${data.draft === 1 ? '' : 's'}` : undefined}
      />
      <MetricCard title="Verified" value={value(data?.verified)} icon={<CheckCircle2 className="w-4 h-4" />} />
      <MetricCard title="Pending Review" value={value(data?.submitted)} icon={<Clock className="w-4 h-4" />} />
      <MetricCard title="Needs Changes" value={value(data?.rejected)} icon={<AlertCircle className="w-4 h-4" />} />
    </div>
  );
}

type Confirming = 'submit' | 'delete' | null;

function EntryDetail({
  id,
  initial,
  onEdit,
  onDeleted,
}: {
  id: number;
  initial?: PortfolioEntry;
  onEdit: (entry: PortfolioEntry) => void;
  onDeleted: () => void;
}) {
  const { data, isLoading, isError, error } = usePortfolioEntry(id);
  const entry = data ?? initial;
  const [confirming, setConfirming] = useState<Confirming>(null);
  const submit = useSubmitPortfolioEntry();
  const remove = useDeletePortfolioEntry();

  if (isError && !entry) return <FormError error={error} fallback="Unable to load this entry." />;
  if (isLoading && !entry) return <LoadingBlock label="Loading entry..." />;
  if (!entry) return null;

  const editable = isEditable(entry.status);
  const resubmit = entry.status === 'REJECTED';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <PortfolioStatusBadge status={entry.status} />
        <h4 className="text-base font-semibold text-[#111111] break-words">{entry.title}</h4>
      </div>

      {entry.status === 'SUBMITTED' && (
        <p className="text-xs text-[#666666] rounded-[10px] bg-[#EFF6FF] border border-[#BFDBFE] p-3">
          Waiting for faculty review. This entry is read-only until it is reviewed.
        </p>
      )}

      <ReviewInfo entry={entry} />
      <EntryContent entry={entry} />

      {editable && (
        <div className="space-y-3 pt-2 border-t border-[#F5F5F5]">
          {confirming === 'submit' ? (
            <ConfirmBox
              confirmLabel={resubmit ? 'Resubmit for Review' : 'Submit for Review'}
              message={
                <>
                  <p className="font-medium">Submit &ldquo;{entry.title}&rdquo; for faculty review?</p>
                  <p className="text-[#666666] mt-1">
                    You won&apos;t be able to edit or delete it while it is pending. If a reviewer asks for changes,
                    it becomes editable again.
                  </p>
                </>
              }
              isLoading={submit.isPending}
              onConfirm={() => submit.mutate(entry.id, { onSuccess: () => setConfirming(null) })}
              onCancel={() => { setConfirming(null); submit.reset(); }}
            />
          ) : confirming === 'delete' ? (
            <ConfirmBox
              variant="danger"
              confirmLabel="Delete Entry"
              message={<p>Delete &ldquo;{entry.title}&rdquo;? This cannot be undone.</p>}
              isLoading={remove.isPending}
              onConfirm={() => remove.mutate(entry.id, { onSuccess: onDeleted })}
              onCancel={() => { setConfirming(null); remove.reset(); }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setConfirming('submit')}>
                {resubmit ? 'Resubmit' : 'Submit'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onEdit(entry)}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setConfirming('delete')}>
                Delete
              </Button>
            </div>
          )}
          {submit.isError && <FormError error={submit.error} fallback="Unable to submit this entry." />}
          {remove.isError && <FormError error={remove.error} fallback="Unable to delete this entry." />}
        </div>
      )}
    </div>
  );
}

function MyPortfolioView() {
  const [status, setStatus] = useState<PortfolioStatus | ''>('');
  const [activityType, setActivityType] = useState<PortfolioActivityType | ''>('');
  const [year, setYear] = useState<number | ''>('');
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);

  const { data, isLoading, isError, error, isFetching } = useMyPortfolio({
    page,
    size: PAGE_SIZE,
    status: status || undefined,
    activityType: activityType || undefined,
    year: year || undefined,
  });

  const hasFilters = !!(status || activityType || year);

  const filtersBar = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
      <select
        aria-label="Filter by status"
        value={status}
        onChange={(e) => { setStatus(e.target.value as PortfolioStatus | ''); setPage(0); }}
        className={SELECT_CLASS}
      >
        <option value="">All Statuses</option>
        {PORTFOLIO_STATUSES.map((s) => <option key={s} value={s}>{PORTFOLIO_STATUS_BADGE[s].label}</option>)}
      </select>
      <select
        aria-label="Filter by activity type"
        value={activityType}
        onChange={(e) => { setActivityType(e.target.value as PortfolioActivityType | ''); setPage(0); }}
        className={SELECT_CLASS}
      >
        <option value="">All Activity Types</option>
        {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</option>)}
      </select>
      <select
        aria-label="Filter by year of start date"
        value={year}
        onChange={(e) => { setYear(e.target.value ? Number(e.target.value) : ''); setPage(0); }}
        className={SELECT_CLASS}
      >
        <option value="">All Years</option>
        {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      {isFetching && !isLoading && <Spinner size="sm" />}
      <Button className="sm:ml-auto" onClick={() => setPanel({ mode: 'create' })}>
        <Plus className="w-4 h-4 mr-1.5" /> Add Entry
      </Button>
    </div>
  );

  const selectedId = panel?.mode === 'view' ? panel.id : panel?.mode === 'edit' ? panel.entry.id : null;
  const listEntry = (id: number) => data?.content.find((e) => e.id === id);

  return (
    <PageContainer contextArea={filtersBar} rawLayout={true}>
      <SummaryCards />
      <div className="flex flex-col-reverse lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {isError ? (
            <ErrorBanner error={error} fallback="Unable to load your portfolio." title="Error Loading Portfolio" />
          ) : (
            <Card>
              {isLoading ? (
                <LoadingBlock label="Loading portfolio..." />
              ) : data?.content.length === 0 ? (
                <EmptyBlock
                  icon={<Award className="w-10 h-10" />}
                  title={hasFilters ? 'No entries match these filters.' : 'No portfolio entries yet.'}
                  hint={hasFilters ? undefined : 'Add hackathons, certifications, internships and other achievements.'}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.content.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className={`cursor-pointer ${selectedId === entry.id ? 'bg-[#F5F5F5]' : ''}`}
                          onClick={() => setPanel({ mode: 'view', id: entry.id })}
                        >
                          <TableCell className="font-medium max-w-[240px]">
                            <button
                              type="button"
                              className="text-left hover:underline focus:outline-none focus:underline"
                              onClick={(e) => { e.stopPropagation(); setPanel({ mode: 'view', id: entry.id }); }}
                            >
                              {entry.title}
                            </button>
                            {entry.status === 'REJECTED' && entry.reviewNote && (
                              <p className="text-xs text-[#DC2626] mt-0.5 line-clamp-2">Reason: {entry.reviewNote}</p>
                            )}
                          </TableCell>
                          <TableCell><Badge variant="outline">{ACTIVITY_TYPE_LABELS[entry.activityType]}</Badge></TableCell>
                          <TableCell className="text-[#666666]">{entry.organization || '—'}</TableCell>
                          <TableCell className="text-[#666666]">{entry.level ? LEVEL_LABELS[entry.level] : '—'}</TableCell>
                          <TableCell className="text-[#666666] whitespace-nowrap">{dateRange(entry)}</TableCell>
                          <TableCell className="text-[#666666]">{entry.achievementResult || '—'}</TableCell>
                          <TableCell><PortfolioStatusBadge status={entry.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {data && <Pagination data={data} onPageChange={setPage} />}
                </>
              )}
            </Card>
          )}
        </div>

        {panel?.mode === 'create' && (
          <SidePanel title="New Portfolio Entry" onClose={() => setPanel(null)}>
            <PortfolioEntryForm onSaved={(entry) => setPanel({ mode: 'view', id: entry.id })} />
          </SidePanel>
        )}
        {panel?.mode === 'edit' && (
          <SidePanel title="Edit Portfolio Entry" onClose={() => setPanel({ mode: 'view', id: panel.entry.id })}>
            <PortfolioEntryForm
              key={panel.entry.id}
              entry={panel.entry}
              onSaved={(entry) => setPanel({ mode: 'view', id: entry.id })}
            />
          </SidePanel>
        )}
        {panel?.mode === 'view' && (
          <SidePanel title="Entry Details" onClose={() => setPanel(null)}>
            <EntryDetail
              key={panel.id}
              id={panel.id}
              initial={listEntry(panel.id)}
              onEdit={(entry) => setPanel({ mode: 'edit', entry })}
              onDeleted={() => setPanel(null)}
            />
          </SidePanel>
        )}
      </div>
    </PageContainer>
  );
}

export default function MyPortfolioPage() {
  return (
    <RequireRole roles={['ROLE_STUDENT']}>
      <MyPortfolioView />
    </RequireRole>
  );
}
