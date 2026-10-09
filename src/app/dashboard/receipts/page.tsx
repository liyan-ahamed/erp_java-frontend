'use client';

import { useState } from 'react';
import { ReceiptText, Search } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { FilterBar } from '@/components/erp/shared';
import { ReceiptView } from '@/components/erp/ReceiptView';
import { useAuth } from '@/contexts/auth-context';
import { useSections } from '@/hooks/useAcademic';
import { useMyReceipts, useReceipt, useReceiptSearch } from '@/hooks/useFees';
import { SELECT_CLASS, formatDate } from '@/lib/gradebook-labels';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, formatMoney } from '@/lib/erp-labels';
import { PaymentMethod, Receipt } from '@/types/fees';

function ReceiptTable({ receipts, showStudent, selectedId, onSelect }: {
  receipts: Receipt[]; showStudent?: boolean; selectedId: number | null; onSelect: (r: Receipt) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Receipt Number</TableHead>
          <TableHead>Date</TableHead>
          {showStudent && <TableHead>Student</TableHead>}
          <TableHead>Fee Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Method</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {receipts.map((r) => (
          <TableRow key={r.id} onClick={() => onSelect(r)} className={`cursor-pointer ${selectedId === r.id ? 'bg-[#F5F5F5]' : ''}`}>
            <TableCell className="font-mono text-xs whitespace-nowrap">
              <button className="hover:underline underline-offset-2" onClick={(e) => { e.stopPropagation(); onSelect(r); }}>{r.receiptNumber}</button>
            </TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(r.paymentDate)}</TableCell>
            {showStudent && (
              <TableCell className="whitespace-nowrap">
                <div className="font-medium">{r.studentName}</div>
                <div className="font-mono text-[11px] text-[#9A9A9A]">{r.registerNumber} · Sec {r.sectionName}</div>
              </TableCell>
            )}
            <TableCell>{r.feeName}</TableCell>
            <TableCell className="text-right whitespace-nowrap font-medium">{formatMoney(r.amount)}</TableCell>
            <TableCell className="text-[#666666] whitespace-nowrap">{PAYMENT_METHOD_LABELS[r.paymentMethod]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Loads the receipt again by id so the detail always reflects the backend record. */
function ReceiptPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading, isError, error } = useReceipt(id);
  return (
    <SidePanel title="Receipt" onClose={onClose}>
      {isLoading ? <div className="py-8 flex justify-center"><Spinner /></div>
        : isError || !data ? <ErrorBanner error={error} fallback="Unable to load the receipt." />
        : <ReceiptView receipt={data} />}
    </SidePanel>
  );
}

function StudentReceipts() {
  const { data, isLoading, isError, error } = useMyReceipts();
  const [selected, setSelected] = useState<number | null>(null);
  if (isLoading) return <LoadingBlock label="Loading your receipts..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load your receipts." title="Error Loading Receipts" />;
  if (data.length === 0) return <Card><EmptyBlock icon={<ReceiptText className="w-10 h-10" />} title="No receipts found." hint="A receipt is created each time the office records one of your payments." /></Card>;
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <Card className="flex-1 min-w-0 w-full">
        <ReceiptTable receipts={data} selectedId={selected} onSelect={(r) => setSelected(r.id)} />
      </Card>
      {selected !== null && <ReceiptPanel id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function HodReceipts() {
  const sections = useSections(null);
  const [filters, setFilters] = useState({ receiptNumber: '', sectionId: '', paymentMethod: '', from: '', to: '' });
  const [receiptInput, setReceiptInput] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const set = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); setPage(0); };

  const { data, isLoading, isError, error, isFetching } = useReceiptSearch({
    page, size: 50,
    receiptNumber: filters.receiptNumber || undefined,
    sectionId: filters.sectionId ? Number(filters.sectionId) : undefined,
    paymentMethod: (filters.paymentMethod || undefined) as PaymentMethod | undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });

  return (
    <div className="space-y-4">
      <FilterBar>
        <form onSubmit={(e) => { e.preventDefault(); set({ receiptNumber: receiptInput.trim() }); }} className="w-full sm:w-64">
          <Input aria-label="Receipt number" placeholder="Receipt number, then Enter" icon={<Search className="w-4 h-4" />}
            value={receiptInput} onChange={(e) => setReceiptInput(e.target.value)} />
        </form>
        <select aria-label="Filter by section" className={SELECT_CLASS} value={filters.sectionId} onChange={(e) => set({ sectionId: e.target.value })}>
          <option value="">All Sections</option>
          {(sections.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.batchName} — Sec {s.name}</option>)}
        </select>
        <select aria-label="Filter by payment method" className={SELECT_CLASS} value={filters.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })}>
          <option value="">All Methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-[#666666]">From
          <input type="date" aria-label="From date" className={SELECT_CLASS} value={filters.from} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-xs text-[#666666]">To
          <input type="date" aria-label="To date" className={SELECT_CLASS} value={filters.to} onChange={(e) => set({ to: e.target.value })} />
        </label>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </FilterBar>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {isLoading ? <LoadingBlock label="Loading receipts..." />
            : isError || !data ? <ErrorBanner error={error} fallback="Unable to load receipts." />
            : data.content.length === 0 ? <Card><EmptyBlock icon={<ReceiptText className="w-10 h-10" />} title="No receipts found." /></Card>
            : (
              <Card>
                <ReceiptTable receipts={data.content} showStudent selectedId={selected} onSelect={(r) => setSelected(r.id)} />
                <Pagination data={data} onPageChange={setPage} />
              </Card>
            )}
        </div>
        {selected !== null && <ReceiptPanel id={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function ReceiptsView() {
  const { hasRole } = useAuth();
  return <PageContainer rawLayout>{hasRole('ROLE_HOD') ? <HodReceipts /> : <StudentReceipts />}</PageContainer>;
}

export default function ReceiptsPage() {
  // STAFF have no financial access on the backend.
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STUDENT']}>
      <ReceiptsView />
    </RequireRole>
  );
}
