import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateExchangeInstallmentInput,
  DecryptedExchangeInstallment,
  ExchangeInstallment,
  UpdateExchangeInstallmentInput,
} from "@/db/schema/types";
import { exchangeInstallmentRepository } from "@/repositories/exchange-installment.repository";
import { useProfileStore } from "@/store/profile-store";

const getProfileId = () => useProfileStore.getState().activeProfileId;

const QUERY_KEYS = {
  all: ["exchange-installments"] as const,
  lists: () => [...QUERY_KEYS.all, "list", getProfileId()] as const,
  list: (exchangeId: number) => [...QUERY_KEYS.lists(), exchangeId] as const,
  details: () => [...QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id, getProfileId()] as const,
  progress: (exchangeId: number) => [...QUERY_KEYS.all, "progress", exchangeId, getProfileId()] as const,
};

export function useInstallments(exchangeId: number) {
  return useQuery<DecryptedExchangeInstallment[]>({
    queryKey: QUERY_KEYS.list(exchangeId),
    queryFn: async () => {
      if (!exchangeId) return [];
      const installments = await exchangeInstallmentRepository.findByExchangeId(exchangeId);
      return exchangeInstallmentRepository.decryptInstallments(installments);
    },
    enabled: !!exchangeId,
  });
}

export function useInstallmentProgress(exchangeId: number, exchangeAmount: number) {
  return useQuery({
    queryKey: QUERY_KEYS.progress(exchangeId),
    queryFn: async () => {
      if (!exchangeId || exchangeAmount <= 0) {
        return {
          totalPaid: 0,
          totalAmount: exchangeAmount,
          remaining: exchangeAmount,
          percentage: 0,
        };
      }
      return exchangeInstallmentRepository.getInstallmentProgress(exchangeId, exchangeAmount);
    },
    enabled: !!exchangeId && exchangeAmount > 0,
  });
}

export function useCreateInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExchangeInstallmentInput) => {
      const installment = await exchangeInstallmentRepository.create(input);
      return exchangeInstallmentRepository.decryptInstallment(installment);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(data.exchange_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progress(data.exchange_id) });
      // Also invalidate exchange queries to update progress badges
      queryClient.invalidateQueries({ queryKey: ["exchanges"] });
    },
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateExchangeInstallmentInput) => {
      const installment = await exchangeInstallmentRepository.update(input);
      return exchangeInstallmentRepository.decryptInstallment(installment);
    },
    onSuccess: async (data) => {
      // Get exchange_id from the installment
      const installment = await exchangeInstallmentRepository.findById(data.id);
      if (installment) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(installment.exchange_id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progress(installment.exchange_id) });
        queryClient.invalidateQueries({ queryKey: ["exchanges"] });
      }
    },
  });
}

export function useDeleteInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, exchangeId }: { id: number; exchangeId: number }) => {
      await exchangeInstallmentRepository.delete(id);
      return { id, exchangeId };
    },
    onSuccess: async (data) => {
      // Invalidate installment queries
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(data.exchangeId) });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progress(data.exchangeId) });
      
      // Invalidate all exchange queries to refresh status (this will trigger status reset check)
      await queryClient.invalidateQueries({ queryKey: ["exchanges"] });
      
      // Specifically invalidate and refetch the exchange detail query to get updated status
      await queryClient.invalidateQueries({ queryKey: ["exchanges", "detail", data.exchangeId] });
      await queryClient.refetchQueries({ queryKey: ["exchanges", "detail", data.exchangeId] });
    },
  });
}

