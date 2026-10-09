import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { feesService } from '@/services/api/fees.service';
import {
  AssignFeeRequest,
  FeeAccountListQuery,
  FeeStructureListQuery,
  FeeStructureRequest,
  ReceiptListQuery,
  RecordPaymentRequest,
  WaiveFeeRequest,
} from '@/types/fees';

const NO_POLLING = { refetchInterval: false } as const;

// ---------- Student ----------

export const useMyFees = () =>
  useQuery({ queryKey: [QUERY_KEYS.MY_FEES], queryFn: feesService.getMyFees, ...NO_POLLING });

export const useMyReceipts = () =>
  useQuery({ queryKey: [QUERY_KEYS.MY_RECEIPTS], queryFn: feesService.getMyReceipts, ...NO_POLLING });

/** HOD, or the owning student. */
export const useReceipt = (id: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.RECEIPT, id],
    queryFn: () => feesService.getReceipt(id as number),
    enabled: id !== null,
    ...NO_POLLING,
  });

// ---------- HOD ----------

export const useFeeStructures = (query: FeeStructureListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.FEE_STRUCTURES, query],
    queryFn: () => feesService.getStructures(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useFeeAccounts = (query: FeeAccountListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.FEE_ACCOUNTS, query],
    queryFn: () => feesService.getAccounts(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useFeeAccount = (id: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.FEE_ACCOUNT, id],
    queryFn: () => feesService.getAccount(id as number),
    enabled: id !== null,
    ...NO_POLLING,
  });

export const useFeeSummary = (enabled = true) =>
  useQuery({ queryKey: [QUERY_KEYS.FEE_SUMMARY], queryFn: feesService.getSummary, enabled, ...NO_POLLING });

export const useReceiptSearch = (query: ReceiptListQuery, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.RECEIPTS, query],
    queryFn: () => feesService.searchReceipts(query),
    placeholderData: keepPreviousData,
    enabled,
    ...NO_POLLING,
  });

export const useSaveFeeStructure = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: FeeStructureRequest }) =>
      id ? feesService.updateStructure(id, payload) : feesService.createStructure(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEE_STRUCTURES] }),
  });
};

export const useAssignFee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ structureId, payload }: { structureId: number; payload: AssignFeeRequest }) =>
      feesService.assignStructure(structureId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEE_STRUCTURES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEE_ACCOUNTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEE_SUMMARY] });
    },
  });
};

const useInvalidateAccount = () => {
  const queryClient = useQueryClient();
  return (accountId: number) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEE_ACCOUNTS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEE_ACCOUNT, accountId] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEE_SUMMARY] });
  };
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAccount();
  return useMutation({
    mutationFn: ({ accountId, payload }: { accountId: number; payload: RecordPaymentRequest }) =>
      feesService.recordPayment(accountId, payload),
    onSuccess: (receipt) => {
      invalidate(receipt.feeAccountId);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECEIPTS] });
    },
  });
};

export const useWaiveFee = () => {
  const invalidate = useInvalidateAccount();
  return useMutation({
    mutationFn: ({ accountId, payload }: { accountId: number; payload: WaiveFeeRequest }) =>
      feesService.waive(accountId, payload),
    onSuccess: (account) => invalidate(account.id),
  });
};
