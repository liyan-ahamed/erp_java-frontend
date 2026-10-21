'use client';

import { FormEvent, useState } from 'react';
import { AlertTriangle, ChevronDown, IndianRupee, Plus, Wallet } from '@/components/ui/icons';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { ActiveBadge, DetailField, EmptyBlock, ErrorBanner, FieldLabel, FormError, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { ConfirmBox, TEXTAREA_CLASS } from '@/components/portfolio/shared';
import { FilterBar, StatTile, StatusBadge, SuccessNote } from '@/components/erp/shared';
import { ReceiptView } from '@/components/erp/ReceiptView';
import { useAuth } from '@/contexts/auth-context';
import { useBatches, useSections } from '@/hooks/useAcademic';
import {
  useAssignFee,
  useFeeAccount,
  useFeeAccounts,
  useFeeStructures,
  useFeeSummary,
  useMyFees,
  useRecordPayment,
  useSaveFeeStructure,
  useWaiveFee,
} from '@/hooks/useFees';
import { SELECT_CLASS, formatDate } from '@/lib/gradebook-labels';
import {
  ACADEMIC_YEAR_PATTERN,
  FEE_STATUSES,
  FEE_STATUS_BADGE,
  FEE_TYPES,
  FEE_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  formatMoney,
  moneyProblem,
  todayIso,
} from '@/lib/erp-labels';
import { FeeStatus, FeeStructure, FeeType, PaymentMethod, Receipt, StudentFeeAccount } from '@/types/fees';
import { Tabs } from '@/components/ui/Tabs';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

function DueDate({ account }: { account: StudentFeeAccount }) {
  return (
    <span className="whitespace-nowrap">
      {formatDate(account.dueDate)}
      {account.overdue && (
        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-danger">
          <AlertTriangle className="w-3 h-3" aria-hidden /> Overdue
        </span>
      )}
    </span>
  );
}

// ---------- STUDENT ----------

/**
 * Year subtotals of the backend's own per-charge figures (amount, paid, balance), added in whole paise so
 * no rounding drift creeps in. Nothing is recalculated: each charge's balance is exactly the backend's.
 */
const sumMoney = (rows: StudentFeeAccount[], key: 'amount' | 'paidAmount' | 'balance') =>
  rows.reduce((paise, a) => paise + Math.round(Number(a[key]) * 100), 0) / 100;

/** "Year 1" when every semester-bound charge in the group belongs to the same year of study. */
const studyYearOf = (rows: StudentFeeAccount[]) => {
  const years = [...new Set(rows.filter((a) => a.semester !== null).map((a) => Math.ceil((a.semester as number) / 2)))];
  return years.length === 1 ? `Year ${years[0]}` : null;
};

function FeeYearRows({ year, rows }: { year: string; rows: StudentFeeAccount[] }) {
  const [open, setOpen] = useState(false);
  const study = studyYearOf(rows);
  const detailId = `fee-year-${year}`;
  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setOpen(!open)}>
        <TableCell>
          <button type="button" className="flex items-center gap-2 text-left" aria-expanded={open} aria-controls={detailId}
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden />
            <span>
              <span className="block font-[550] text-fg">{year}</span>
              <span className="block text-[11px] text-muted">{study ? `${study} · ` : ''}{rows.length} particular{rows.length === 1 ? '' : 's'}</span>
            </span>
          </button>
        </TableCell>
        <TableCell className="text-right whitespace-nowrap">{formatMoney(sumMoney(rows, 'amount'))}</TableCell>
        <TableCell className="text-right whitespace-nowrap">{formatMoney(sumMoney(rows, 'paidAmount'))}</TableCell>
        <TableCell className="text-right whitespace-nowrap font-[550]">{formatMoney(sumMoney(rows, 'balance'))}</TableCell>
      </TableRow>
      {open && (
        <TableRow id={detailId} className="hover:!bg-transparent">
          <TableCell colSpan={4} className="!p-0 bg-soft">
            <div className="overflow-x-auto">
              <table className="f-table !bg-transparent">
                <thead>
                  <tr>
                    <th>Particular</th>
                    <th className="text-right whitespace-nowrap">Actual Amount</th>
                    <th className="text-right">Concession</th>
                    <th className="text-right">Payable</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Balance</th>
                    <th className="whitespace-nowrap">Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="font-medium">{a.feeName}</div>
                        <div className="text-[11px] text-muted">{FEE_TYPE_LABELS[a.feeType]}{a.semester ? ` · Semester ${a.semester}` : ''}</div>
                        {a.status === 'WAIVED' && a.waiverReason && <div className="text-[11px] text-muted mt-0.5">Waiver: {a.waiverReason}</div>}
                      </td>
                      <td className="text-right whitespace-nowrap">{formatMoney(a.amount)}</td>
                      <td className="text-right text-muted" title="Concessions are not recorded separately by the ERP yet">—</td>
                      <td className="text-right whitespace-nowrap">{formatMoney(a.amount)}</td>
                      <td className="text-right whitespace-nowrap">{formatMoney(a.paidAmount)}</td>
                      <td className="text-right whitespace-nowrap font-[550]">{formatMoney(a.balance)}</td>
                      <td><DueDate account={a} /></td>
                      <td><StatusBadge info={FEE_STATUS_BADGE[a.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function StudentFees() {
  const { data, isLoading, isError, error } = useMyFees();
  if (isLoading) return <LoadingBlock label="Loading your fee details..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load your fee details." title="Error Loading Fees" />;
  if (data.accounts.length === 0) return <Card><EmptyBlock icon={<Wallet className="w-10 h-10" />} title="No fee structure configured." hint="Fee details appear here once the department assigns your fees." /></Card>;

  const byYear = new Map<string, StudentFeeAccount[]>();
  data.accounts.forEach((a) => byYear.set(a.academicYear, [...(byYear.get(a.academicYear) ?? []), a]));
  const years = [...byYear.keys()].sort();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile label="Total Payable" value={formatMoney(data.totalCharged)} hint="All charges" />
        <StatTile label="Total Paid" value={formatMoney(data.totalPaid)} />
        <StatTile label="Balance" value={formatMoney(data.totalOutstanding)} hint="Waived amounts are not outstanding" />
      </div>
      <Card>
        <div className="px-5 py-3.5 border-b border-line">
          <h3 className="text-[13px] font-[550] text-fg">Fee details by academic year</h3>
          <p className="text-[12px] text-muted mt-0.5">Expand a year to see each particular.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Academic Year / Student Year</TableHead>
              <TableHead className="text-right whitespace-nowrap">Payable Amount</TableHead>
              <TableHead className="text-right whitespace-nowrap">Paid Amount</TableHead>
              <TableHead className="text-right whitespace-nowrap">Balance Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.map((y) => <FeeYearRows key={y} year={y} rows={byYear.get(y) ?? []} />)}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted">
        Amounts and balances are the department&apos;s records. Concessions are not recorded separately yet, so Payable equals the actual amount; a waived charge has no balance.
        Payments are recorded by the department office; there is no online payment in this ERP. Receipts are listed under My Receipts.
      </p>
    </div>
  );
}

// ---------- HOD: summary ----------

function FeeSummaryTiles() {
  const { data, isLoading, isError, error } = useFeeSummary();
  if (isLoading) return <div className="py-4"><Spinner /></div>;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load the fee summary." />;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="Total Charged" value={formatMoney(data.totalCharged)} hint={`${data.accounts} charges`} />
        <StatTile label="Total Paid" value={formatMoney(data.totalPaid)} />
        <StatTile label="Total Waived" value={formatMoney(data.totalWaived)} />
        <StatTile label="Outstanding" value={formatMoney(data.totalOutstanding)} />
        <StatTile label="Overdue" value={formatMoney(data.overdueOutstanding)} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted">
        {FEE_STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5"><StatusBadge info={FEE_STATUS_BADGE[s]} /> {data.accountsByStatus[s] ?? 0}</span>
        ))}
      </div>
    </div>
  );
}

// ---------- HOD: charges ----------

function PaymentForm({ account, onRecorded }: { account: StudentFeeAccount; onRecorded: (r: Receipt) => void }) {
  const record = useRecordPayment();
  const [form, setForm] = useState({ amount: '', paymentDate: todayIso(), paymentMethod: 'CASH' as PaymentMethod, reference: '', remarks: '' });
  const [problem, setProblem] = useState('');
  const set = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setProblem(''); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amountProblem = moneyProblem(form.amount);
    if (amountProblem) return setProblem(amountProblem);
    if (form.paymentDate && form.paymentDate > todayIso()) return setProblem('Payment date cannot be in the future.');
    record.mutate({
      accountId: account.id,
      payload: {
        amount: form.amount.trim(),
        paymentDate: form.paymentDate || null,
        paymentMethod: form.paymentMethod,
        reference: form.reference.trim() || null,
        remarks: form.remarks.trim() || null,
      },
    }, { onSuccess: onRecorded });
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-[10px] border border-line bg-soft p-4" noValidate>
      <p className="text-sm font-[550] text-fg">Record Payment</p>
      <p className="text-xs text-muted">Balance {formatMoney(account.balance)}. The amount cannot exceed the balance. No payment gateway is involved — this records a payment already received.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="pay-amount">Amount (₹)</FieldLabel>
          <Input id="pay-amount" inputMode="decimal" required value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="pay-date">Payment Date</FieldLabel>
          <Input id="pay-date" type="date" max={todayIso()} value={form.paymentDate} onChange={(e) => set({ paymentDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="pay-method">Method</FieldLabel>
          <select id="pay-method" className={`${SELECT_CLASS} w-full`} value={form.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value as PaymentMethod })}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="pay-reference">Reference (optional)</FieldLabel>
          <Input id="pay-reference" maxLength={100} value={form.reference} onChange={(e) => set({ reference: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="pay-remarks">Remarks (optional)</FieldLabel>
        <Input id="pay-remarks" maxLength={255} value={form.remarks} onChange={(e) => set({ remarks: e.target.value })} />
      </div>
      {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
      {record.isError && <FormError error={record.error} fallback="Unable to record the payment." />}
      <Button type="submit" size="sm" isLoading={record.isPending}>Record Payment</Button>
    </form>
  );
}

function WaiveForm({ account, onDone }: { account: StudentFeeAccount; onDone: () => void }) {
  const waive = useWaiveFee();
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="space-y-3 rounded-[10px] border border-line bg-soft p-4">
      <p className="text-sm font-[550] text-fg">Waive Remaining Balance</p>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="waive-reason">Reason (required)</FieldLabel>
        <textarea id="waive-reason" rows={2} maxLength={500} className={TEXTAREA_CLASS} value={reason} onChange={(e) => { setReason(e.target.value); setConfirming(false); }} />
      </div>
      {waive.isError && <FormError error={waive.error} fallback="Unable to waive the fee." />}
      {confirming ? (
        <ConfirmBox message={<>Waive the remaining {formatMoney(account.balance)} for {account.studentName}? This cannot be undone.</>}
          confirmLabel="Waive Balance" variant="danger" isLoading={waive.isPending} onCancel={() => setConfirming(false)}
          onConfirm={() => waive.mutate({ accountId: account.id, payload: { reason: reason.trim() } }, { onSuccess: onDone })} />
      ) : (
        <Button size="sm" variant="secondary" disabled={!reason.trim()} onClick={() => { waive.reset(); setConfirming(true); }}>Waive Balance</Button>
      )}
    </div>
  );
}

function AccountPanel({ accountId }: { accountId: number }) {
  const { data, isLoading, isError, error } = useFeeAccount(accountId);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [waived, setWaived] = useState(false);

  if (isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load the fee charge." />;
  const a = data.account;
  const open = a.status === 'UNPAID' || a.status === 'PARTIALLY_PAID';

  if (receipt) {
    return (
      <div className="space-y-3">
        <SuccessNote>Payment recorded. Receipt {receipt.receiptNumber} was created.</SuccessNote>
        <ReceiptView receipt={receipt} />
        <Button size="sm" variant="ghost" onClick={() => setReceipt(null)}>Back to charge</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Student" value={a.studentName} />
        <DetailField label="Register No." value={<span className="font-mono text-xs">{a.registerNumber}</span>} />
        <DetailField label="Fee" value={a.feeName} />
        <DetailField label="Status" value={<StatusBadge info={FEE_STATUS_BADGE[a.status]} />} />
        <DetailField label="Amount" value={formatMoney(a.amount)} />
        <DetailField label="Paid" value={formatMoney(a.paidAmount)} />
        <DetailField label="Balance" value={formatMoney(a.balance)} />
        <DetailField label="Due Date" value={<DueDate account={a} />} />
      </div>
      {a.waiverReason && <DetailField label="Waiver Reason" value={a.waiverReason} />}
      {waived && <SuccessNote>Balance waived.</SuccessNote>}

      <div>
        <FieldLabel>Payments</FieldLabel>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted mt-1">No payments recorded yet.</p>
        ) : (
          <ul className="mt-1 divide-y divide-line text-sm">
            {data.payments.map((p) => (
              <li key={p.id} className="py-2 flex justify-between gap-3">
                <button className="font-mono text-xs hover:underline underline-offset-2 text-left" onClick={() => setReceipt(p)}>{p.receiptNumber}</button>
                <span className="text-muted text-xs">{formatDate(p.paymentDate)} · {PAYMENT_METHOD_LABELS[p.paymentMethod]}</span>
                <span className="font-medium whitespace-nowrap">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && <PaymentForm key={`pay-${a.updatedAt}`} account={a} onRecorded={setReceipt} />}
      {open && <WaiveForm key={`waive-${a.updatedAt}`} account={a} onDone={() => setWaived(true)} />}
    </div>
  );
}

function ChargesTab() {
  const sections = useSections(null);
  const structures = useFeeStructures({ page: 0, size: 100 });
  const [filters, setFilters] = useState({ sectionId: '', feeStructureId: '', status: '', outstandingOnly: false });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const set = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); setPage(0); };

  const { data, isLoading, isError, error, isFetching } = useFeeAccounts({
    page, size: 50,
    sectionId: filters.sectionId ? Number(filters.sectionId) : undefined,
    feeStructureId: filters.feeStructureId ? Number(filters.feeStructureId) : undefined,
    status: (filters.status || undefined) as FeeStatus | undefined,
    outstandingOnly: filters.outstandingOnly || undefined,
  });

  return (
    <div className="space-y-4">
      <FilterBar>
        <select aria-label="Filter by section" className={SELECT_CLASS} value={filters.sectionId} onChange={(e) => set({ sectionId: e.target.value })}>
          <option value="">All Sections</option>
          {(sections.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.batchName} — Sec {s.name}</option>)}
        </select>
        <select aria-label="Filter by fee structure" className={SELECT_CLASS} value={filters.feeStructureId} onChange={(e) => set({ feeStructureId: e.target.value })}>
          <option value="">All Fees</option>
          {(structures.data?.content ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select aria-label="Filter by status" className={SELECT_CLASS} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">All Statuses</option>
          {FEE_STATUSES.map((s) => <option key={s} value={s}>{FEE_STATUS_BADGE[s].label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={filters.outstandingOnly} onChange={(e) => set({ outstandingOnly: e.target.checked })} /> Outstanding only
        </label>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </FilterBar>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {isLoading ? <LoadingBlock label="Loading fee charges..." />
            : isError || !data ? <ErrorBanner error={error} fallback="Unable to load fee charges." />
            : data.content.length === 0 ? <Card><EmptyBlock icon={<Wallet className="w-10 h-10" />} title="No fee records found." /></Card>
            : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.content.map((a) => (
                      <TableRow key={a.id} onClick={() => setSelected(a.id)} className={`cursor-pointer ${selected === a.id ? 'bg-soft' : ''}`}>
                        <TableCell className="whitespace-nowrap">
                          <button className="font-medium hover:underline underline-offset-2 text-left" onClick={(e) => { e.stopPropagation(); setSelected(a.id); }}>{a.studentName}</button>
                          <div className="font-mono text-[11px] text-muted">{a.registerNumber} · Sec {a.sectionName}</div>
                        </TableCell>
                        <TableCell>{a.feeName}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatMoney(a.amount)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatMoney(a.paidAmount)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap font-[550]">{formatMoney(a.balance)}</TableCell>
                        <TableCell><DueDate account={a} /></TableCell>
                        <TableCell><StatusBadge info={FEE_STATUS_BADGE[a.status]} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination data={data} onPageChange={setPage} />
              </Card>
            )}
        </div>
        {selected !== null && (
          <SidePanel title="Fee Charge" onClose={() => setSelected(null)}>
            <AccountPanel key={selected} accountId={selected} />
          </SidePanel>
        )}
      </div>
    </div>
  );
}

// ---------- HOD: fee structures ----------

function StructureForm({ structure, onSaved }: { structure?: FeeStructure; onSaved: () => void }) {
  const batches = useBatches();
  const save = useSaveFeeStructure();
  const assigned = (structure?.assignedCount ?? 0) > 0;
  const [form, setForm] = useState({
    name: structure?.name ?? '',
    feeType: (structure?.feeType ?? 'TUITION') as FeeType,
    academicYear: structure?.academicYear ?? '',
    semester: structure?.semester ? String(structure.semester) : '',
    batchId: structure?.batchId ? String(structure.batchId) : '',
    amount: structure ? Number(structure.amount).toFixed(2) : '',
    dueDate: structure?.dueDate ?? '',
    active: structure?.active ?? true,
  });
  const [problem, setProblem] = useState('');
  const set = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setProblem(''); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setProblem('Name is required.');
    if (!ACADEMIC_YEAR_PATTERN.test(form.academicYear.trim())) return setProblem('Academic year must look like 2026-2027.');
    const amountProblem = moneyProblem(form.amount);
    if (amountProblem) return setProblem(amountProblem);
    save.mutate({
      id: structure?.id,
      payload: {
        name: form.name.trim(),
        feeType: form.feeType,
        academicYear: form.academicYear.trim(),
        semester: form.semester ? Number(form.semester) : null,
        batchId: form.batchId ? Number(form.batchId) : null,
        amount: form.amount.trim(),
        dueDate: form.dueDate || null,
        active: form.active,
      },
    }, { onSuccess: onSaved });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="fs-name">Name</FieldLabel>
        <Input id="fs-name" maxLength={150} value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="fs-type">Fee Type</FieldLabel>
          <select id="fs-type" className={`${SELECT_CLASS} w-full`} value={form.feeType} onChange={(e) => set({ feeType: e.target.value as FeeType })}>
            {FEE_TYPES.map((t) => <option key={t} value={t}>{FEE_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="fs-year">Academic Year</FieldLabel>
          <Input id="fs-year" placeholder="2026-2027" value={form.academicYear} onChange={(e) => set({ academicYear: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="fs-sem">Semester (optional)</FieldLabel>
          <select id="fs-sem" className={`${SELECT_CLASS} w-full`} value={form.semester} onChange={(e) => set({ semester: e.target.value })}>
            <option value="">—</option>
            {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="fs-batch">Batch (optional)</FieldLabel>
          <select id="fs-batch" className={`${SELECT_CLASS} w-full`} value={form.batchId} onChange={(e) => set({ batchId: e.target.value })}>
            <option value="">—</option>
            {(batches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            {structure?.batchId && !(batches.data ?? []).some((b) => b.id === structure.batchId) && (
              <option value={structure.batchId}>{structure.batchName}</option>
            )}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="fs-amount">Amount (₹)</FieldLabel>
          <Input id="fs-amount" inputMode="decimal" value={form.amount} disabled={assigned} onChange={(e) => set({ amount: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="fs-due">Due Date (optional)</FieldLabel>
          <Input id="fs-due" type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
        </div>
      </div>
      {assigned && <p className="text-xs text-warn">The amount is fixed because this fee has already been charged to students.</p>}
      <label className="flex items-center gap-2 text-sm text-fg">
        <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active
      </label>
      {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
      {save.isError && <FormError error={save.error} fallback="Unable to save the fee structure." />}
      <Button type="submit" isLoading={save.isPending}>{structure ? 'Save Changes' : 'Create Fee Structure'}</Button>
    </form>
  );
}

function AssignForm({ structure }: { structure: FeeStructure }) {
  const assign = useAssignFee();
  const sections = useSections(structure.batchId, true);
  const [target, setTarget] = useState<'batch' | 'section'>(structure.batchId ? 'batch' : 'section');
  const [sectionId, setSectionId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [confirming, setConfirming] = useState(false);
  const sectionName = (sections.data ?? []).find((s) => s.id === Number(sectionId));
  const ready = target === 'batch' ? !!structure.batchId : !!sectionId;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Charges <strong>{structure.name}</strong> ({formatMoney(structure.amount)}) to students. Students already charged are skipped. Students are notified by the system.
      </p>
      <fieldset className="space-y-2">
        <legend className="text-[10px] font-[550] text-muted uppercase tracking-wider mb-1">Charge to</legend>
        <label className={`flex items-center gap-2 text-sm ${structure.batchId ? '' : 'opacity-50'}`}>
          <input type="radio" name="assign-target" checked={target === 'batch'} disabled={!structure.batchId} onChange={() => { setTarget('batch'); setConfirming(false); }} />
          Whole batch {structure.batchName ?? '(no batch set on this fee)'}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="assign-target" checked={target === 'section'} onChange={() => { setTarget('section'); setConfirming(false); }} /> One section
        </label>
      </fieldset>
      {target === 'section' && (
        <select aria-label="Section" className={`${SELECT_CLASS} w-full`} value={sectionId} onChange={(e) => { setSectionId(e.target.value); setConfirming(false); }}>
          <option value="">Select a section…</option>
          {(sections.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.batchName} — Sec {s.name}</option>)}
        </select>
      )}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="assign-due">Due Date override (optional)</FieldLabel>
        <Input id="assign-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      {assign.isError && <FormError error={assign.error} fallback="Unable to assign the fee." />}
      {assign.isSuccess && (
        <SuccessNote>Assigned to {assign.data.assigned} student(s); {assign.data.alreadyAssigned} already had this charge ({assign.data.targetedStudents} targeted).</SuccessNote>
      )}
      {confirming ? (
        <ConfirmBox
          message={<>Charge {formatMoney(structure.amount)} to {target === 'batch' ? `every active student of batch ${structure.batchName}` : `every active student of section ${sectionName?.name ?? ''}`}?</>}
          confirmLabel="Assign Fee" isLoading={assign.isPending} onCancel={() => setConfirming(false)}
          onConfirm={() => assign.mutate({
            structureId: structure.id,
            payload: { sectionId: target === 'section' ? Number(sectionId) : null, dueDate: dueDate || null },
          }, { onSettled: () => setConfirming(false) })}
        />
      ) : (
        <Button disabled={!ready || !structure.active} onClick={() => { assign.reset(); setConfirming(true); }}>Assign Fee</Button>
      )}
      {!structure.active && <p className="text-xs text-muted">Inactive fee structures cannot be assigned.</p>}
    </div>
  );
}

type StructurePanel = { mode: 'create' } | { mode: 'edit'; structure: FeeStructure } | { mode: 'assign'; structure: FeeStructure } | null;

function StructuresTab() {
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<StructurePanel>(null);
  const { data, isLoading, isError, error } = useFeeStructures({ page, size: 20 });

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setPanel({ mode: 'create' })}><Plus className="w-4 h-4" /> New Fee Structure</Button>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {isLoading ? <LoadingBlock label="Loading fee structures..." />
            : isError || !data ? <ErrorBanner error={error} fallback="Unable to load fee structures." />
            : data.content.length === 0 ? <Card><EmptyBlock icon={<IndianRupee className="w-10 h-10" />} title="No fee structures yet." /></Card>
            : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="whitespace-nowrap">Year / Sem</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                      <TableHead>Charged</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.content.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="text-muted">{FEE_TYPE_LABELS[f.feeType]}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted">{f.academicYear}{f.semester ? ` · S${f.semester}` : ''}</TableCell>
                        <TableCell className="text-muted">{f.batchName ?? '—'}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatMoney(f.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(f.dueDate)}</TableCell>
                        <TableCell>{f.assignedCount}</TableCell>
                        <TableCell><ActiveBadge active={f.active} /></TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => setPanel({ mode: 'edit', structure: f })}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => setPanel({ mode: 'assign', structure: f })}>Assign</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination data={data} onPageChange={setPage} />
              </Card>
            )}
        </div>
        {panel && (
          <SidePanel title={panel.mode === 'create' ? 'New Fee Structure' : panel.mode === 'edit' ? 'Edit Fee Structure' : 'Assign Fee'} onClose={() => setPanel(null)}>
            {panel.mode === 'create' && <StructureForm onSaved={() => setPanel(null)} />}
            {panel.mode === 'edit' && <StructureForm key={panel.structure.id} structure={panel.structure} onSaved={() => setPanel(null)} />}
            {panel.mode === 'assign' && <AssignForm key={panel.structure.id} structure={panel.structure} />}
          </SidePanel>
        )}
      </div>
    </div>
  );
}

function HodFees() {
  const [tab, setTab] = useState<'charges' | 'structures'>('charges');
  return (
    <div className="space-y-6">
      <FeeSummaryTiles />
      <Tabs label="Fee views" value={tab} onChange={setTab}
        items={[{ value: 'charges', label: 'Student Charges' }, { value: 'structures', label: 'Fee Structures' }] as const} />
      {tab === 'charges' ? <ChargesTab /> : <StructuresTab />}
    </div>
  );
}

function FeesView() {
  const { hasRole } = useAuth();
  return <PageContainer rawLayout>{hasRole('ROLE_HOD') ? <HodFees /> : <StudentFees />}</PageContainer>;
}

export default function FeesPage() {
  // STAFF have no financial access on the backend.
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STUDENT']}>
      <FeesView />
    </RequireRole>
  );
}
