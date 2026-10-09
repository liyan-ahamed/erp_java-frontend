import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDate, formatDateTime } from '@/lib/gradebook-labels';
import { FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS, formatMoney } from '@/lib/erp-labels';
import { Receipt } from '@/types/fees';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-[#F5F5F5] last:border-b-0 text-sm">
      <dt className="text-[#666666]">{label}</dt>
      <dd className="text-[#111111] font-medium text-right break-words">{value}</dd>
    </div>
  );
}

/** A printable receipt, built only from the backend's receipt data. Printing uses the browser. */
export function ReceiptView({ receipt }: { receipt: Receipt }) {
  return (
    <div className="space-y-4">
      <div className="print-area bg-white rounded-[10px] border border-[#E8E8E8] p-5">
        <div className="flex items-start justify-between gap-3 border-b border-[#E8E8E8] pb-3 mb-2">
          <div>
            <p className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Fee Receipt</p>
            <p className="text-lg font-bold text-[#111111] font-mono">{receipt.receiptNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Amount Paid</p>
            <p className="text-lg font-bold text-[#111111]">{formatMoney(receipt.amount)}</p>
          </div>
        </div>
        <dl>
          <Row label="Student Name" value={receipt.studentName} />
          <Row label="Register Number" value={<span className="font-mono">{receipt.registerNumber}</span>} />
          <Row label="Section" value={receipt.sectionName} />
          <Row label="Fee" value={`${receipt.feeName} (${FEE_TYPE_LABELS[receipt.feeType]})`} />
          <Row label="Academic Year" value={`${receipt.academicYear}${receipt.semester ? ` · Semester ${receipt.semester}` : ''}`} />
          <Row label="Charge Amount" value={formatMoney(receipt.chargeAmount)} />
          <Row label="Payment Date" value={formatDate(receipt.paymentDate)} />
          <Row label="Payment Method" value={PAYMENT_METHOD_LABELS[receipt.paymentMethod]} />
          <Row label="Reference" value={receipt.reference || '—'} />
          {receipt.remarks && <Row label="Remarks" value={receipt.remarks} />}
          {receipt.recordedByName && <Row label="Recorded By" value={receipt.recordedByName} />}
          <Row label="Recorded On" value={formatDateTime(receipt.createdAt)} />
        </dl>
      </div>
      <Button className="no-print" variant="secondary" onClick={() => window.print()}>
        <Printer className="w-4 h-4 mr-1.5" /> Print Receipt
      </Button>
    </div>
  );
}
