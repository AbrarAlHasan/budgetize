import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { CreateTransactionInput, UpdateTransactionInput, Transaction } from '@/db/schema/types';

const QUERY_KEYS = {
  all: ['transactions'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: {
    accountId?: number;
    tagId?: number;
    categoryId?: number;
    startDate?: string;
    endDate?: string;
    type?: Transaction['type'];
  }) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
  byAccount: (accountId: number) => [...QUERY_KEYS.all, 'account', accountId] as const,
  byDateRange: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'dateRange', startDate, endDate] as const,
};

export function useTransactions(filters?: {
  accountId?: number;
  tagId?: number;
  categoryId?: number;
  startDate?: string;
  endDate?: string;
  type?: Transaction['type'];
}) {
  return useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: async () => {
      const transactions = await transactionRepository.findAllWithFilters(filters);
      return transactionRepository.decryptTransactions(transactions);
    },
  });
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const transaction = await transactionRepository.findById(id);
      if (!transaction) return null;
      return transactionRepository.decryptTransaction(transaction);
    },
    enabled: !!id,
  });
}

export function useTransactionsByAccount(accountId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.byAccount(accountId),
    queryFn: async () => {
      const transactions = await transactionRepository.findByAccountId(accountId);
      return transactionRepository.decryptTransactions(transactions);
    },
    enabled: !!accountId,
  });
}

export function useTransactionsByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: QUERY_KEYS.byDateRange(startDate, endDate),
    queryFn: async () => {
      const transactions = await transactionRepository.findByDateRange(startDate, endDate);
      return transactionRepository.decryptTransactions(transactions);
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) => transactionRepository.create(input),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => transactionRepository.update(input),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => transactionRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

