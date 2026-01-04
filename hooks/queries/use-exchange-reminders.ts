import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateExchangeReminderInput,
  ExchangeReminder,
  UpdateExchangeReminderInput,
} from "@/db/schema/types";
import { exchangeReminderRepository } from "@/repositories/exchange-reminder.repository";
import { useProfileStore } from "@/store/profile-store";

const getProfileId = () => useProfileStore.getState().activeProfileId;

const QUERY_KEYS = {
  all: ["exchange-reminders"] as const,
  lists: () => [...QUERY_KEYS.all, "list", getProfileId()] as const,
  list: (exchangeId: number) => [...QUERY_KEYS.lists(), exchangeId] as const,
  upcoming: () => [...QUERY_KEYS.all, "upcoming", getProfileId()] as const,
  overdue: () => [...QUERY_KEYS.all, "overdue", getProfileId()] as const,
  details: () => [...QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id, getProfileId()] as const,
};

export function useReminders(exchangeId: number) {
  return useQuery<ExchangeReminder[]>({
    queryKey: QUERY_KEYS.list(exchangeId),
    queryFn: async () => {
      if (!exchangeId) return [];
      return exchangeReminderRepository.findByExchangeId(exchangeId);
    },
    enabled: !!exchangeId,
  });
}

export function useUpcomingReminders(limit?: number) {
  return useQuery<ExchangeReminder[]>({
    queryKey: [...QUERY_KEYS.upcoming(), limit],
    queryFn: async () => {
      return exchangeReminderRepository.getUpcomingReminders(limit);
    },
  });
}

export function useOverdueReminders() {
  return useQuery<ExchangeReminder[]>({
    queryKey: QUERY_KEYS.overdue(),
    queryFn: async () => {
      return exchangeReminderRepository.getOverdueReminders();
    },
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExchangeReminderInput) => {
      return exchangeReminderRepository.create(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(data.exchange_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.upcoming() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overdue() });
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateExchangeReminderInput) => {
      return exchangeReminderRepository.update(input);
    },
    onSuccess: async (data) => {
      const reminder = await exchangeReminderRepository.findById(data.id);
      if (reminder) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(reminder.exchange_id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.upcoming() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overdue() });
      }
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, exchangeId }: { id: number; exchangeId: number }) => {
      await exchangeReminderRepository.delete(id);
      return { id, exchangeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(data.exchangeId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.upcoming() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overdue() });
    },
  });
}

export function useMarkReminderAsSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notificationId }: { id: number; notificationId?: string }) => {
      return exchangeReminderRepository.markAsSent(id, notificationId);
    },
    onSuccess: async (data) => {
      const reminder = await exchangeReminderRepository.findById(data.id);
      if (reminder) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(reminder.exchange_id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.upcoming() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overdue() });
      }
    },
  });
}

