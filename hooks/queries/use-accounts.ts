import { Account, CreateAccountInput, DecryptedAccount, UpdateAccountInput } from '@/db/schema/types';
import { accountRepository } from '@/repositories/account.repository';
import { useProfileStore } from '@/store/profile-store';
import { logPerformance } from '@/utils/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const getProfileId = () => useProfileStore.getState().activeProfileId;

const QUERY_KEYS = {
  all: ['accounts'] as const,
  lists: () => [...QUERY_KEYS.all, 'list', getProfileId()] as const,
  list: (filters?: { type?: Account['type'] }) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail', getProfileId()] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
};

export function useAccounts(filters?: { type?: Account['type'] }) {
  return useQuery<DecryptedAccount[]>({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: async () => {
      const startTime = Date.now();
      
      let accounts;
      if (filters?.type) {
        accounts = await accountRepository.findByType(filters.type);
      } else {
        accounts = await accountRepository.findAll();
      }

      const result = await accountRepository.decryptAccounts(accounts);
      
      const endTime = Date.now();
      logPerformance('useAccounts_query', endTime - startTime, `${result.length} accounts`);
      
      return result;
    },
  });
}

export function useAccount(id: number) {
  return useQuery<DecryptedAccount | null>({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const startTime = Date.now();
      
      const account = await accountRepository.findById(id);
      if (!account) {
        const endTime = Date.now();
        logPerformance('useAccount_query', endTime - startTime, 'not found');
        return null;
      }
      const result = await accountRepository.decryptAccount(account);
      
      const endTime = Date.now();
      logPerformance('useAccount_query', endTime - startTime);
      
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

