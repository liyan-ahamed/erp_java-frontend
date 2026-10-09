'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ClipboardCheck, Search, ShieldAlert, UserRound } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyBlock, ErrorBanner, FieldLabel, FormError, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import {
  ConfirmBox,
  EntryContent,
  PortfolioStatusBadge,
  ReviewInfo,
  StudentIdentity,
  TEXTAREA_CLASS,
  httpStatus,
} from '@/components/portfolio/shared';
import { useBatches, useSections } from '@/hooks/useAcademic';
import {
  usePortfolioEntry,
  usePortfolioReviewQueue,
  useRejectPortfolioEntry,
  useVerifyPortfolioEntry,
} from '@/hooks/usePortfolio';
import { ROUTES } from '@/constants/routes';
import { SELECT_CLASS, formatDateTime } from '@/lib/gradebook-labels';
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  LEVELS,
  LEVEL_LABELS,
  MIN_REJECTION_NOTE_LENGTH,
  PORTFOLIO_STATUS_BADGE,
} from '@/lib/portfolio-labels';
import { PortfolioActivityType, PortfolioEntry, PortfolioLevel, PortfolioReviewQuery } from '@/types/portfolio';

const PAGE_SIZE = 20;
type ReviewStatus = NonNullable<PortfolioReviewQuery['status']>;
const REVIEW_STATUSES: ReviewStatus[] = ['SUBMITTED', 'VERIFIED', 'REJECTED'];

type Deciding = 'verify' | 'reject' | null;

function ReviewDetail({ id, initial }: { id: number; initial?: PortfolioEntry }) {
  const { data, isLoading, isError, error } = usePortfolioEntry(id);
  const [deciding, setDeciding] = useState<Deciding>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const verify = useVerifyPortfolioEntry();
  const reject = useRejectPortfolioEntry();

  // Only show data the backend has confirmed this reviewer may see (a direct link may be out of scope).
  const entry = data ?? (isError ? undefined : initial);

  if (isError) {
    const status = httpStatus(error);
    return (
      <div className="space-y-3">
        {status === 403 && (
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111111]">
            <ShieldAlert className="w-4 h-4" aria-hidden /> Access denied
          </div>
        )}
        <FormError error={error} fallback="Unable to load this entry." />
      </div>
    );
  }
  if (isLoading && !entry) return <LoadingBlock label="Loading entry..." />;
  if (!entry) return null;

  const cancel = () => {
    setDeciding(null);
    setNote('');
    setNoteError(null);
    verify.reset();
    reject.reset();
  };

  const doVerify = () =>
    verify.mutate(
      { id: entry.id, reviewNote: note.trim() || undefined },
      { onSuccess: () => { cancel(); setDone('Entry verified. The student has been notified.'); } },
    );

  const doReject = () => {
    if (note.trim().length < MIN_REJECTION_NOTE_LENGTH) {
      setNoteError(`Explain what the student should change (at least ${MIN_REJECTION_NOTE_LENGTH} characters).`);
      return;
    }
    setNoteError(null);
    reject.mutate(
      { id: entry.id, reviewNote: note.trim() },
      { onSuccess: () => { cancel(); setDone('Entry sent back for changes. The student has been notified.'); } },
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <PortfolioStatusBadge status={entry.status} />
        <h4 className="text-base font-semibold text-[#111111] break-words">{entry.title}</h4>
      </div>

      {done && (
        <p className="text-sm rounded-[10px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] p-3" role="status">{done}</p>
      )}

      <div className="space-y-3">
        <StudentIdentity entry={entry} />
        <Link
          href={ROUTES.PORTFOLIO_STUDENT(entry.studentId)}
          className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline"
        >
          <UserRound className="w-3.5 h-3.5" aria-hidden /> View verified portfolio
        </Link>
      </div>

      <ReviewInfo entry={entry} />
      <EntryContent entry={entry} />

      {entry.status === 'SUBMITTED' && (
        <div className="space-y-3 pt-2 border-t border-[#F5F5F5]">
          {deciding === 'verify' ? (
            <ConfirmBox
              confirmLabel="Verify Entry"
              message={<p>Verify &ldquo;{entry.title}&rdquo;? Verified entries become a permanent part of the student&apos;s portfolio.</p>}
              isLoading={verify.isPending}
              onConfirm={doVerify}
              onCancel={cancel}
            >
              <div className="space-y-1.5">
                <FieldLabel htmlFor="verify-note">Note to student (optional)</FieldLabel>
                <textarea
                  id="verify-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className={TEXTAREA_CLASS}
                />
              </div>
            </ConfirmBox>
          ) : deciding === 'reject' ? (
            <ConfirmBox
              variant="danger"
              confirmLabel="Reject Entry"
              message={<p>Send &ldquo;{entry.title}&rdquo; back to the student for changes.</p>}
              isLoading={reject.isPending}
              onConfirm={doReject}
              onCancel={cancel}
            >
              <div className="space-y-1.5">
                <FieldLabel htmlFor="reject-note">What should the student change? *</FieldLabel>
                <textarea
                  id="reject-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  required
                  aria-invalid={!!noteError}
                  className={TEXTAREA_CLASS}
                />
                <p className="text-xs text-[#9A9A9A]">{note.trim().length}/1000 · at least {MIN_REJECTION_NOTE_LENGTH} characters</p>
                {noteError && <p className="text-xs text-red-600" role="alert">{noteError}</p>}
              </div>
            </ConfirmBox>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { setDone(null); setDeciding('verify'); }}>Verify</Button>
              <Button size="sm" variant="danger" onClick={() => { setDone(null); setDeciding('reject'); }}>Reject</Button>
            </div>
          )}
          {verify.isError && <FormError error={verify.error} fallback="Unable to verify this entry." />}
          {reject.isError && <FormError error={reject.error} fallback="Unable to reject this entry." />}
        </div>
      )}
    </div>
  );
}

function ReviewQueueView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const entryParam = Number(searchParams.get('entry'));
  const selectedId = Number.isInteger(entryParam) && entryParam > 0 ? entryParam : null;

  const [status, setStatus] = useState<ReviewStatus>('SUBMITTED');
  const [activityType, setActivityType] = useState<PortfolioActivityType | ''>('');
  const [level, setLevel] = useState<PortfolioLevel | ''>('');
  const [batchId, setBatchId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Search runs on the server; wait for typing to pause before querying.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const batches = useBatches();
  const sections = useSections(batchId, batchId !== null);

  const { data, isLoading, isError, error, isFetching } = usePortfolioReviewQueue({
    page,
    size: PAGE_SIZE,
    status,
    activityType: activityType || undefined,
    level: level || undefined,
    batchId: batchId ?? undefined,
    sectionId: sectionId ?? undefined,
    search: search || undefined,
  });

  // The selected entry lives in the URL so a direct link opens it.
  const select = (id: number | null) => router.replace(id ? `${pathname}?entry=${id}` : pathname, { scroll: false });

  const filtersBar = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
      <div className="flex-1 w-full sm:max-w-xs">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Student, register no. or title..."
          aria-label="Search review queue"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          maxLength={100}
        />
      </div>
      <select
        aria-label="Filter by status"
        value={status}
        onChange={(e) => { setStatus(e.target.value as ReviewStatus); setPage(0); }}
        className={SELECT_CLASS}
      >
        {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{PORTFOLIO_STATUS_BADGE[s].label}</option>)}
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
        aria-label="Filter by level"
        value={level}
        onChange={(e) => { setLevel(e.target.value as PortfolioLevel | ''); setPage(0); }}
        className={SELECT_CLASS}
      >
        <option value="">All Levels</option>
        {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
      </select>
      <select
        aria-label="Filter by batch"
        value={batchId ?? ''}
        onChange={(e) => { setBatchId(e.target.value ? Number(e.target.value) : null); setSectionId(null); setPage(0); }}
        className={SELECT_CLASS}
        disabled={!batches.data}
      >
        <option value="">All Batches</option>
        {batches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select
        aria-label="Filter by section"
        value={sectionId ?? ''}
        onChange={(e) => { setSectionId(e.target.value ? Number(e.target.value) : null); setPage(0); }}
        className={SELECT_CLASS}
        disabled={batchId === null || !sections.data}
        title={batchId === null ? 'Pick a batch first' : undefined}
      >
        <option value="">All Sections</option>
        {sections.data?.map((s) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
      </select>
      {isFetching && !isLoading && <Spinner size="sm" />}
    </div>
  );

  const emptyTitle = status === 'SUBMITTED' ? 'No entries waiting for review.' : `No ${PORTFOLIO_STATUS_BADGE[status].label.toLowerCase()} entries.`;

  return (
    <PageContainer contextArea={filtersBar} rawLayout={true}>
      <div className="flex flex-col-reverse lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {isError ? (
            <ErrorBanner error={error} fallback="Unable to load the review queue." title="Error Loading Review Queue" />
          ) : (
            <Card>
              {isLoading ? (
                <LoadingBlock label="Loading review queue..." />
              ) : data?.content.length === 0 ? (
                <EmptyBlock icon={<ClipboardCheck className="w-10 h-10" />} title={emptyTitle} />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>{status === 'SUBMITTED' ? 'Submitted' : 'Reviewed'}</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.content.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className={`cursor-pointer ${selectedId === entry.id ? 'bg-[#F5F5F5]' : ''}`}
                          onClick={() => select(entry.id)}
                        >
                          <TableCell>
                            <div className="font-medium">{entry.studentName}</div>
                            <div className="text-xs text-[#9A9A9A] font-mono">{entry.registerNumber || '—'}</div>
                          </TableCell>
                          <TableCell className="text-[#666666] whitespace-nowrap">
                            {entry.batchName} · {entry.sectionName}
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            <button
                              type="button"
                              className="text-left font-medium hover:underline focus:outline-none focus:underline"
                              onClick={(e) => { e.stopPropagation(); select(entry.id); }}
                            >
                              {entry.title}
                            </button>
                            {entry.organization && <div className="text-xs text-[#9A9A9A]">{entry.organization}</div>}
                          </TableCell>
                          <TableCell><Badge variant="outline">{ACTIVITY_TYPE_LABELS[entry.activityType]}</Badge></TableCell>
                          <TableCell className="text-[#666666]">{entry.level ? LEVEL_LABELS[entry.level] : '—'}</TableCell>
                          <TableCell className="text-[#666666] whitespace-nowrap">
                            {formatDateTime(status === 'SUBMITTED' ? entry.submittedAt : entry.reviewedAt)}
                          </TableCell>
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

        {selectedId !== null && (
          <SidePanel title="Review Entry" onClose={() => select(null)}>
            <ReviewDetail key={selectedId} id={selectedId} initial={data?.content.find((e) => e.id === selectedId)} />
          </SidePanel>
        )}
      </div>
    </PageContainer>
  );
}

export default function PortfolioReviewPage() {
  return (
    <RequireRole roles={['ROLE_STAFF', 'ROLE_HOD']}>
      <Suspense fallback={<PageContainer><LoadingBlock label="Loading..." /></PageContainer>}>
        <ReviewQueueView />
      </Suspense>
    </RequireRole>
  );
}
