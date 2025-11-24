import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountRepository } from '@/repositories/account.repository';
import { Account, CreateAccountInput, DecryptedAccount, UpdateAccountInput } from '@/db/schema/types';
import { logPerformance } from '@/utils/logger';

const QUERY_KEYS = {
  all: ['accounts'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: { type?: Account['type'] }) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
};

export function useAccounts(filters?: { type?: Account['type'] }) {
  return useQuery<DecryptedAccount[]>({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: async () => {
      const startTime = Date.now();
      logPerformance('useAccounts query started', 0);
      
      const queryStartTime = Date.now();
      let accounts;
      if (filters?.type) {
        accounts = await accountRepository.findByType(filters.type);
      } else {
        accounts = await accountRepository.findAll();
      }
      const queryEndTime = Date.now();
      logPerformance('useAccounts query fetch', queryEndTime - queryStartTime, `${accounts.length} accounts`);

      const decryptStartTime = Date.now();
      const result = await accountRepository.decryptAccounts(accounts);
      const decryptEndTime = Date.now();
      logPerformance('useAccounts decrypt', decryptEndTime - decryptStartTime, `${result.length} accounts`);
      
      const endTime = Date.now();
      logPerformance('useAccounts query completed', endTime - startTime);
      
      return result;
    },
  });
}

export function useAccount(id: number) {
  return useQuery<DecryptedAccount | null>({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const startTime = Date.now();
      logPerformance(`useAccount(${id}) query started`, 0);
      
      const account = await accountRepository.findById(id);
      if (!account) {
        const endTime = Date.now();
        logPerformance(`useAccount(${id}) query completed`, endTime - startTime, 'not found');
        return null;
      }
      const result = await accountRepository.decryptAccount(account);
      
      const endTime = Date.now();
      logPerformance(`useAccount(${id}) query completed`, endTime - startTime);
      
      return result;
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

