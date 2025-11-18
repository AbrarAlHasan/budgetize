import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { categoryRepository } from '@/repositories/category.repository';
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
  categoryId: number;
  categoryName: string;
  amount: number;
  count: number;
}

export function useDashboardData(month?: Date, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.dashboard);
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
  const filters = useUIStore((state) => state.filters.dashboard);
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

      // Get all transaction categories
      const categoryMap = new Map<number, { name: string; amount: number; count: number }>();

      for (const transaction of decrypted) {
        if (transaction.type === 'expense') {
          const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
          
          if (!transaction.category_id) {
            // Uncategorized
            const uncategorized = categoryMap.get(0) || { name: 'Uncategorized', amount: 0, count: 0 };
            uncategorized.amount += amount;
            uncategorized.count += 1;
            categoryMap.set(0, uncategorized);
          } else {
            const existing = categoryMap.get(transaction.category_id) || { 
              name: `Category ${transaction.category_id}`, 
              amount: 0, 
              count: 0 
            };
            existing.amount += amount;
            existing.count += 1;
            categoryMap.set(transaction.category_id, existing);
          }
        }
      }

      // Fetch category names
      const breakdown: CategoryBreakdown[] = [];

      for (const [categoryId, data] of categoryMap.entries()) {
        if (categoryId === 0) {
          breakdown.push({
            categoryId: 0,
            categoryName: data.name,
            amount: data.amount,
            count: data.count,
          });
        } else {
          const category = await categoryRepository.findById(categoryId);
          const decryptedCategory = category ? await categoryRepository.decryptCategory(category) : null;
          breakdown.push({
            categoryId,
            categoryName: decryptedCategory?.name || data.name,
            amount: data.amount,
            count: data.count,
          });
        }
      }

      return breakdown.sort((a, b) => b.amount - a.amount);
    },
  });
}

