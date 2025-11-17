import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useUIStore } from '@/store/ui-store';

const QUERY_KEYS = {
  all: ['dashboard'] as const,
  monthly: (month: string) => [...QUERY_KEYS.all, 'monthly', month] as const,
  categoryBreakdown: (month: string) => [...QUERY_KEYS.all, 'category', month] as const,
};

interface DashboardData {
  totalSpending: number;
  totalIncome: number;
  netAmount: number;
  transactionCount: number;
}

interface CategoryBreakdown {
  tagId: number;
  tagName: string;
  amount: number;
  count: number;
}

export function useDashboardData(month?: Date, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters);
  const targetMonth = month || new Date();
  const monthKey = format(targetMonth, 'yyyy-MM');
  
  // Use filter dates if available, otherwise use month range
  const startDate = useFilters && filters.startDate 
    ? filters.startDate 
    : format(startOfMonth(targetMonth), 'yyyy-MM-dd');
  const endDate = useFilters && filters.endDate 
    ? filters.endDate 
    : format(endOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.monthly(monthKey), 'filters', filters]
      : QUERY_KEYS.monthly(monthKey),
    queryFn: async (): Promise<DashboardData> => {
      const filterOptions = useFilters ? {
        startDate,
        endDate,
        accountId: filters.accountId || undefined,
        tagId: filters.tagId || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.transactionType || undefined,
      } : { startDate, endDate };
      
      const transactions = await transactionRepository.findAllWithFilters(filterOptions);
      const decrypted = await transactionRepository.decryptTransactions(transactions);

      let totalSpending = 0;
      let totalIncome = 0;

      for (const transaction of decrypted) {
        const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
        if (transaction.type === 'expense') {
          totalSpending += amount;
        } else {
          totalIncome += amount;
        }
      }

      return {
        totalSpending,
        totalIncome,
        netAmount: totalIncome - totalSpending,
        transactionCount: decrypted.length,
      };
    },
  });
}

export function useCategoryBreakdown(month?: Date, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters);
  const targetMonth = month || new Date();
  const monthKey = format(targetMonth, 'yyyy-MM');
  
  // Use filter dates if available, otherwise use month range
  const startDate = useFilters && filters.startDate 
    ? filters.startDate 
    : format(startOfMonth(targetMonth), 'yyyy-MM-dd');
  const endDate = useFilters && filters.endDate 
    ? filters.endDate 
    : format(endOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.categoryBreakdown(monthKey), 'filters', filters]
      : QUERY_KEYS.categoryBreakdown(monthKey),
    queryFn: async (): Promise<CategoryBreakdown[]> => {
      const filterOptions = useFilters ? {
        startDate,
        endDate,
        accountId: filters.accountId || undefined,
        tagId: filters.tagId || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.transactionType || undefined,
      } : { startDate, endDate };
      
      const transactions = await transactionRepository.findAllWithFilters(filterOptions);
      const decrypted = await transactionRepository.decryptTransactions(transactions);

      // Get all transaction tags
      const tagMap = new Map<number, { name: string; amount: number; count: number }>();

      for (const transaction of decrypted) {
        if (transaction.type === 'expense') {
          const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
          const tags = await transactionTagRepository.findByTransactionId(transaction.id);
          
          if (tags.length === 0) {
            // Uncategorized
            const uncategorized = tagMap.get(0) || { name: 'Uncategorized', amount: 0, count: 0 };
            uncategorized.amount += amount;
            uncategorized.count += 1;
            tagMap.set(0, uncategorized);
          } else {
            for (const tag of tags) {
              const existing = tagMap.get(tag.tag_id) || { 
                name: `Tag ${tag.tag_id}`, 
                amount: 0, 
                count: 0 
              };
              existing.amount += amount;
              existing.count += 1;
              tagMap.set(tag.tag_id, existing);
            }
          }
        }
      }

      // Fetch tag names
      const { tagRepository } = await import('@/repositories/tag.repository');
      const breakdown: CategoryBreakdown[] = [];

      for (const [tagId, data] of tagMap.entries()) {
        if (tagId === 0) {
          breakdown.push({
            tagId: 0,
            tagName: data.name,
            amount: data.amount,
            count: data.count,
          });
        } else {
          const tag = await tagRepository.findById(tagId);
          const decryptedTag = tag ? await tagRepository.decryptTag(tag) : null;
          breakdown.push({
            tagId,
            tagName: decryptedTag?.name || data.name,
            amount: data.amount,
            count: data.count,
          });
        }
      }

      return breakdown.sort((a, b) => b.amount - a.amount);
    },
  });
}

