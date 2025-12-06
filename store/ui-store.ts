import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { AccountType, TransactionType } from '@/db/schema/types';
import { persistentStorage } from '@/storage/mmkv';
import { endOfMonth, format, startOfMonth } from 'date-fns';

interface FilterState {
  accountId: number | null; // Single account filter (for backward compatibility)
  accountIds: number[]; // Multiple account filter
  tagId: number | null; // Single tag filter (for backward compatibility)
  tagIds: number[]; // Multiple tag filter
  categoryId: number | null; // Single category filter (for backward compatibility)
  categoryIds: number[]; // Multiple category filter
  startDate: string | null;
  endDate: string | null;
  transactionType: TransactionType | null; // Single transaction type filter (for backward compatibility)
  transactionTypes: TransactionType[]; // Multiple transaction type filter
  accountType: AccountType | null; // Single account type filter (for backward compatibility)
  accountTypes: AccountType[]; // Multiple account type filter
}

export type FilterContext = 'dashboard' | 'reports' | 'expenses';

type FiltersByContext = Record<FilterContext, FilterState>;

interface UIStore {
  // Filters
  filters: FiltersByContext;
  currentFilterContext: FilterContext;
  setCurrentFilterContext: (context: FilterContext) => void;
  setAccountFilter: (context: FilterContext, accountId: number | null) => void;
  setAccountIdsFilter: (context: FilterContext, accountIds: number[]) => void;
  setTagFilter: (context: FilterContext, tagId: number | null) => void;
  setTagIdsFilter: (context: FilterContext, tagIds: number[]) => void;
  setCategoryFilter: (context: FilterContext, categoryId: number | null) => void;
  setCategoryIdsFilter: (context: FilterContext, categoryIds: number[]) => void;
  setDateRangeFilter: (context: FilterContext, startDate: string | null, endDate: string | null) => void;
  setTransactionTypeFilter: (context: FilterContext, type: TransactionType | null) => void;
  setTransactionTypesFilter: (context: FilterContext, types: TransactionType[]) => void;
  setAccountTypeFilter: (context: FilterContext, type: AccountType | null) => void;
  setAccountTypesFilter: (context: FilterContext, types: AccountType[]) => void;
  clearFilters: (context: FilterContext) => void;

  // Form state
  selectedAccountId: number | null;
  setSelectedAccountId: (id: number | null) => void;

  selectedTagIds: number[];
  setSelectedTagIds: (ids: number[]) => void;
  toggleTagId: (id: number) => void;

  // Date picker state
  datePickerVisible: boolean;
  setDatePickerVisible: (visible: boolean) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
}

/**
 * Get current month date range as ISO strings
 */
const getCurrentMonthDates = () => {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
};

const createInitialFilterState = (): FilterState => {
  const { startDate, endDate } = getCurrentMonthDates();
  return {
    accountId: null,
    accountIds: [],
    tagId: null,
    tagIds: [],
    categoryId: null,
    categoryIds: [],
    startDate, // Default to current month start
    endDate, // Default to current month end
    transactionType: null,
    transactionTypes: [],
    accountType: null,
    accountTypes: [],
  };
};

const createInitialFilters = (): FiltersByContext => ({
  dashboard: createInitialFilterState(),
  reports: createInitialFilterState(),
  expenses: createInitialFilterState(),
});

const updateFiltersForContext = (
  filters: FiltersByContext,
  context: FilterContext,
  updates: Partial<FilterState>
): FiltersByContext => ({
  ...filters,
  [context]: {
    ...filters[context],
    ...updates,
  },
});

const ensureFiltersStructure = (filters?: Partial<FiltersByContext>): FiltersByContext => {
  const safeFilters = filters ?? {};
  return {
    dashboard: {
      ...createInitialFilterState(),
      ...(safeFilters.dashboard ?? {}),
    },
    reports: {
      ...createInitialFilterState(),
      ...(safeFilters.reports ?? {}),
    },
    expenses: {
      ...createInitialFilterState(),
      ...(safeFilters.expenses ?? {}),
    },
  };
};

const mmkvZustandStorage: StateStorage = persistentStorage;

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
  // Filters
      filters: createInitialFilters(),
      currentFilterContext: 'dashboard',
      setCurrentFilterContext: (context) => set({ currentFilterContext: context }),
      setAccountFilter: (context, accountId) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            accountId,
            accountIds: accountId ? [accountId] : [],
          }),
        })),
      setAccountIdsFilter: (context, accountIds) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            accountIds,
            accountId: accountIds.length === 1 ? accountIds[0] : null,
          }),
        })),
      setTagFilter: (context, tagId) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            tagId,
            tagIds: tagId ? [tagId] : [],
          }),
        })),
      setTagIdsFilter: (context, tagIds) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            tagIds,
            tagId: tagIds.length === 1 ? tagIds[0] : null,
          }),
        })),
      setCategoryFilter: (context, categoryId) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            categoryId,
            categoryIds: categoryId ? [categoryId] : [],
          }),
        })),
      setCategoryIdsFilter: (context, categoryIds) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            categoryIds,
            categoryId: categoryIds.length === 1 ? categoryIds[0] : null,
          }),
        })),
      setDateRangeFilter: (context, startDate, endDate) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, { startDate, endDate }),
        })),
      setTransactionTypeFilter: (context, transactionType) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            transactionType,
            transactionTypes: transactionType ? [transactionType] : [],
          }),
        })),
      setTransactionTypesFilter: (context, transactionTypes) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            transactionTypes,
            transactionType: transactionTypes.length === 1 ? transactionTypes[0] : null,
          }),
        })),
      setAccountTypeFilter: (context, accountType) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            accountType,
            accountTypes: accountType ? [accountType] : [],
          }),
        })),
      setAccountTypesFilter: (context, accountTypes) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            accountTypes,
            accountType: accountTypes.length === 1 ? accountTypes[0] : null,
          }),
        })),
      clearFilters: (context) => {
        const { startDate, endDate } = getCurrentMonthDates();
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, {
            ...createInitialFilterState(),
            startDate, // Reset to current month
            endDate, // Reset to current month
          }),
        }));
      },

      // Form state
      selectedAccountId: null,
      setSelectedAccountId: (id) => set({ selectedAccountId: id }),

      selectedTagIds: [],
      setSelectedTagIds: (ids) => set({ selectedTagIds: ids }),
      toggleTagId: (id) =>
        set((state) => {
          const index = state.selectedTagIds.indexOf(id);
          if (index > -1) {
            return {
              selectedTagIds: state.selectedTagIds.filter((tagId) => tagId !== id),
            };
          } else {
            return {
              selectedTagIds: [...state.selectedTagIds, id],
            };
          }
        }),

      // Date picker state
      datePickerVisible: false,
      setDatePickerVisible: (visible) => set({ datePickerVisible: visible }),
      selectedDate: null,
      setSelectedDate: (date) => set({ selectedDate: date }),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => mmkvZustandStorage),
      partialize: (state) => ({
        filters: state.filters,
        currentFilterContext: state.currentFilterContext,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<UIStore> | null;
        if (!persisted) {
          return currentState;
        }
        
        // Ensure filters structure is correct
        const normalizedFilters = persisted.filters 
          ? ensureFiltersStructure(persisted.filters)
          : createInitialFilters();
        
        // Ensure dates are never null - set to current month if null
        const { startDate: defaultStartDate, endDate: defaultEndDate } = getCurrentMonthDates();
        const normalizedFiltersWithDates: FiltersByContext = {
          dashboard: {
            ...normalizedFilters.dashboard,
            startDate: normalizedFilters.dashboard.startDate || defaultStartDate,
            endDate: normalizedFilters.dashboard.endDate || defaultEndDate,
          },
          reports: {
            ...normalizedFilters.reports,
            startDate: normalizedFilters.reports.startDate || defaultStartDate,
            endDate: normalizedFilters.reports.endDate || defaultEndDate,
          },
          expenses: {
            ...normalizedFilters.expenses,
            startDate: normalizedFilters.expenses.startDate || defaultStartDate,
            endDate: normalizedFilters.expenses.endDate || defaultEndDate,
          },
        };
        
        return {
          ...currentState,
          ...persisted,
          filters: normalizedFiltersWithDates,
        };
      },
    }
  )
);

