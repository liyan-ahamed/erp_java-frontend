// /fees and /receipts — money values are backend BigDecimals (2 decimals), sent as JSON numbers.
// They are only displayed; totals and balances always come from the backend.

export type FeeType = 'TUITION' | 'EXAM' | 'LAB' | 'DEPARTMENT' | 'OTHER';

export type FeeStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'UPI' | 'OTHER';

export interface FeeStructure {
  id: number;
  name: string;
  feeType: FeeType;
  academicYear: string;
  semester: number | null;
  batchId: number | null;
  batchName: string | null;
  amount: number;
  dueDate: string | null;
  active: boolean;
  assignedCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FeeStructureListQuery {
  page: number;
  size: number;
  academicYear?: string;
  semester?: number;
  batchId?: number;
  feeType?: FeeType;
  active?: boolean;
}

/** amount: > 0, at most 2 decimals. The amount is fixed once the structure is assigned. */
export interface FeeStructureRequest {
  name: string;
  feeType: FeeType;
  academicYear: string;
  semester: number | null;
  batchId: number | null;
  amount: string;
  dueDate: string | null;
  active: boolean;
}

/** studentIds, else sectionId, else the structure's batch. dueDate overrides the structure's. */
export interface AssignFeeRequest {
  studentIds?: number[];
  sectionId?: number | null;
  dueDate?: string | null;
}

export interface AssignFeeResult {
  feeStructureId: number;
  targetedStudents: number;
  assigned: number;
  alreadyAssigned: number;
}

/** One fee charge of one student. balance = amount - paidAmount (0 when WAIVED). */
export interface StudentFeeAccount {
  id: number;
  studentId: number;
  registerNumber: string;
  studentName: string;
  sectionName: string;
  feeStructureId: number;
  feeName: string;
  feeType: FeeType;
  academicYear: string;
  semester: number | null;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string | null;
  overdue: boolean;
  status: FeeStatus;
  waiverReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FeeAccountListQuery {
  page: number;
  size: number;
  studentId?: number;
  sectionId?: number;
  batchId?: number;
  feeStructureId?: number;
  status?: FeeStatus;
  outstandingOnly?: boolean;
}

export interface FeeAccountDetail {
  account: StudentFeeAccount;
  payments: Receipt[];
}

/** paymentDate defaults to today and cannot be in the future; amount cannot exceed the balance. */
export interface RecordPaymentRequest {
  amount: string;
  paymentDate: string | null;
  paymentMethod: PaymentMethod;
  reference: string | null;
  remarks: string | null;
}

export interface WaiveFeeRequest {
  reason: string;
}

export interface FeeSummary {
  accounts: number;
  totalCharged: number;
  totalPaid: number;
  totalWaived: number;
  totalOutstanding: number;
  overdueOutstanding: number;
  accountsByStatus: Partial<Record<FeeStatus, number>>;
}

/** GET /fees/me. */
export interface MyFees {
  totalCharged: number;
  totalPaid: number;
  totalOutstanding: number;
  accounts: StudentFeeAccount[];
}

/** A receipt = one recorded fee payment (FeePayment on the backend). */
export interface Receipt {
  id: number;
  receiptNumber: string;
  studentId: number;
  registerNumber: string;
  studentName: string;
  sectionName: string;
  feeAccountId: number;
  feeStructureId: number;
  feeName: string;
  feeType: FeeType;
  academicYear: string;
  semester: number | null;
  chargeAmount: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string | null;
  remarks: string | null;
  recordedByName: string | null;
  createdAt: string | null;
}

/** Alias matching the backend entity name. */
export type FeePayment = Receipt;

export interface ReceiptListQuery {
  page: number;
  size: number;
  receiptNumber?: string;
  studentId?: number;
  sectionId?: number;
  feeStructureId?: number;
  paymentMethod?: PaymentMethod;
  from?: string;
  to?: string;
}
