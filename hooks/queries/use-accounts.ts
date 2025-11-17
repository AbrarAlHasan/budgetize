import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountRepository } from '@/repositories/account.repository';
import { Account, CreateAccountInput, UpdateAccountInput } from '@/db/schema/types';

const QUERY_KEYS = {
  all: ['accounts'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: { type?: Account['type'] }) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
};

export function useAccounts(filters?: { type?: Account['type'] }) {
  return useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: async () => {
      let accounts;
      if (filters?.type) {
        accounts = await accountRepository.findByType(filters.type);
      } else {
        accounts = await accountRepository.findAll();
      }
      return accountRepository.decryptAccounts(accounts);
    },
  });
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const account = await accountRepository.findById(id);
      if (!account) return null;
      return accountRepository.decryptAccount(account);
    },
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAccountInput) => accountRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAccountInput) => accountRepository.update(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => accountRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

