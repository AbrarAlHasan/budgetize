import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagRepository } from '@/repositories/tag.repository';
import { transactionRepository } from '@/repositories/transaction.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { CreateTagInput, UpdateTagInput, TransactionType, AccountType } from '@/db/schema/types';
import { useSettingsStore } from '@/store/settings-store';
import { incomePreferenceKey } from '@/utils/income-preference';

const QUERY_KEYS = {
  all: ['tags'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
  withTransactions: (filters: any) => [...QUERY_KEYS.all, 'withTransactions', filters] as const,
};

export function useTags() {
  return useQuery({
    queryKey: QUERY_KEYS.lists(),
    queryFn: async () => {
      const tags = await tagRepository.findAll();
      return tagRepository.decryptTags(tags);
    },
  });
}

export function useTag(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const tag = await tagRepository.findById(id);
      if (!tag) return null;
      return tagRepository.decryptTag(tag);
    },
    enabled: !!id,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTagInput) => tagRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTagInput) => tagRepository.update(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => tagRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

interface TagsWithTransactionsFilters {
  startDate?: string | null;
  endDate?: string | null;
  accountId?: number | null;
  categoryId?: number | null;
  transactionType?: TransactionType | null;
  accountType?: AccountType | null;
}

/**
 * Fetches tags (including deleted ones) that have associated transactions
 * matching the provided filters. This is useful for filter screens to show
 * only relevant tags.
 */
export function useTagsWithTransactions(filters: TagsWithTransactionsFilters = {}) {
  const incomeEnabled = useSettingsStore((state) => state.settings.incomeCalculationEnabled);

  return useQuery({
    queryKey: [...QUERY_KEYS.withTransactions(filters), incomePreferenceKey(incomeEnabled)],
    queryFn: async () => {
      // Build filter options (excluding tagId since we want all tags)
      const filterOptions: any = {};
      if (filters.startDate) filterOptions.startDate = filters.startDate;
      if (filters.endDate) filterOptions.endDate = filters.endDate;
      if (filters.accountId) filterOptions.accountId = filters.accountId;
      if (filters.categoryId) filterOptions.categoryId = filters.categoryId;
      if (filters.transactionType) filterOptions.type = filters.transactionType;
      
      // Apply income preference filter at SQL level if needed
      if (!incomeEnabled) {
        filterOptions.types = ['expense'];
      }
      
      // Use optimized method to get unique tag IDs directly from SQL
      const tagIdsArray = await transactionRepository.findUniqueTagIdsFromTransactions(filterOptions);
      const tagIds = new Set(tagIdsArray);
      
      // Fetch all tags (active and deleted) that have transactions
      const tagsWithTransactions = [];
      for (const tagId of tagIds) {
        const tag = await tagRepository.findByIdIncludingDeleted(tagId);
        if (tag) {
          const decryptedTag = await tagRepository.decryptTag(tag);
          tagsWithTransactions.push({
            ...decryptedTag,
            isDeleted: tag.deleted_at !== null,
          });
        }
      }
      
      // Sort: active tags first (alphabetically), then deleted tags (alphabetically)
      return tagsWithTransactions.sort((a, b) => {
        if (a.isDeleted === b.isDeleted) {
          return a.name.localeCompare(b.name);
        }
        return a.isDeleted ? 1 : -1;
      });
    },
  });
}

/**
 * Fetches all active tags PLUS any deleted tags that are attached to a specific transaction.
 * This is useful for edit transaction screens where we need to show selected deleted tags.
 */
export function useTagsForTransaction(transactionId?: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.all, 'forTransaction', transactionId],
    queryFn: async () => {
      // Get all active tags
      const activeTags = await tagRepository.findAll();
      const decryptedActiveTags = await tagRepository.decryptTags(activeTags);
      
      const tagsMap = new Map<number, any>();
      
      // Add active tags to map
      for (const tag of decryptedActiveTags) {
        tagsMap.set(tag.id, { ...tag, isDeleted: false });
      }
      
      // If transaction ID is provided, fetch its deleted tags
      if (transactionId) {
        const transactionTags = await transactionTagRepository.findByTransactionId(transactionId);
        
        for (const tt of transactionTags) {
          // If tag is not in map (meaning it's deleted), fetch and add it
          if (!tagsMap.has(tt.tag_id)) {
            const deletedTag = await tagRepository.findByIdIncludingDeleted(tt.tag_id);
            if (deletedTag && deletedTag.deleted_at !== null) {
              const decryptedTag = await tagRepository.decryptTag(deletedTag);
              tagsMap.set(tt.tag_id, { ...decryptedTag, isDeleted: true });
            }
          }
        }
      }
      
      // Convert map to array and sort
      return Array.from(tagsMap.values()).sort((a, b) => {
        if (a.isDeleted === b.isDeleted) {
          return a.name.localeCompare(b.name);
        }
        return a.isDeleted ? 1 : -1;
      });
    },
    enabled: true,
  });
}

