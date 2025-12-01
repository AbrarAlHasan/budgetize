import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateExchangeInput,
  DecryptedExchange,
  Exchange,
  ExchangeStatus,
  ExchangeType,
  UpdateExchangeInput,
} from "@/db/schema/types";
import { exchangeRepository } from "@/repositories/exchange.repository";
import { logPerformance } from "@/utils/logger";

const QUERY_KEYS = {
  all: ["exchanges"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (filters?: { type?: ExchangeType; status?: ExchangeStatus }) =>
    [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
  summary: () => [...QUERY_KEYS.all, "summary"] as const,
};

export function useExchanges(filters?: { 
  type?: ExchangeType; 
  status?: ExchangeStatus;
  settled?: boolean;
}) {
  return useQuery<DecryptedExchange[]>({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: async () => {
      const startTime = Date.now();
      logPerformance("useExchanges query started", 0);

      // Use the optimized method that handles all filtering in SQL
      const exchanges = await exchangeRepository.findAllWithFilters(filters);

      const decryptStartTime = Date.now();
      const result = await exchangeRepository.decryptExchanges(exchanges);
      const decryptEndTime = Date.now();
      logPerformance(
        "useExchanges decrypt",
        decryptEndTime - decryptStartTime,
        `${result.length} exchanges`
      );

      const endTime = Date.now();
      logPerformance("useExchanges query completed", endTime - startTime);

      return result;
    },
  });
}

export function useExchange(id: number) {
  return useQuery<DecryptedExchange | null>({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const exchange = await exchangeRepository.findById(id);
      if (!exchange) return null;
      return exchangeRepository.decryptExchange(exchange);
    },
    enabled: !!id,
  });
}

export function usePendingExchangesSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.summary(),
    queryFn: async () => {
      return exchangeRepository.getPendingSummary();
    },
  });
}

export function useCreateExchange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExchangeInput) => {
      const exchange = await exchangeRepository.create(input);
      return exchangeRepository.decryptExchange(exchange);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

export function useUpdateExchange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateExchangeInput) => {
      const exchange = await exchangeRepository.update(input);
      return exchangeRepository.decryptExchange(exchange);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
    },
  });
}

export function useDeleteExchange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await exchangeRepository.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

export function useMarkExchangeAsSettled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const exchange = await exchangeRepository.markAsSettled(id);
      return exchangeRepository.decryptExchange(exchange);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary() });
    },
  });
}

