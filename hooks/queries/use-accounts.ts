import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountRepository } from '@/repositories/account.repository';
import { Account, CreateAccountInput, DecryptedAccount, UpdateAccountInput } from '@/db/schema/types';

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
      console.log('[Performance] useAccounts query started');
      
      const queryStartTime = Date.now();
      let accounts;
      if (filters?.type) {
        accounts = await accountRepository.findByType(filters.type);
      } else {
        accounts = await accountRepository.findAll();
      }
      const queryEndTime = Date.now();
      console.log(`[Performance] useAccounts query fetch: ${queryEndTime - queryStartTime}ms (${accounts.length} accounts)`);

      const decryptStartTime = Date.now();
      const result = await accountRepository.decryptAccounts(accounts);
      const decryptEndTime = Date.now();
      console.log(`[Performance] useAccounts decrypt: ${decryptEndTime - decryptStartTime}ms (${result.length} accounts)`);
      
      const endTime = Date.now();
      console.log(`[Performance] useAccounts query completed in ${endTime - startTime}ms`);
      
      return result;
    },
  });
}

export function useAccount(id: number) {
  return useQuery<DecryptedAccount | null>({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const startTime = Date.now();
      console.log(`[Performance] useAccount(${id}) query started`);
      
      const account = await accountRepository.findById(id);
      if (!account) {
        const endTime = Date.now();
        console.log(`[Performance] useAccount(${id}) query completed in ${endTime - startTime}ms (not found)`);
        return null;
      }
      const result = await accountRepository.decryptAccount(account);
      
      const endTime = Date.now();
      console.log(`[Performance] useAccount(${id}) query completed in ${endTime - startTime}ms`);
      
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

