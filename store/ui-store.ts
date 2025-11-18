import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { AccountType, TransactionType } from '@/db/schema/types';
import { persistentStorage } from '@/storage/mmkv';

interface FilterState {
  accountId: number | null;
  tagId: number | null; // Single tag filter (for backward compatibility)
  tagIds: number[]; // Multiple tag filter
  categoryId: number | null; // Category filter by ID
  startDate: string | null;
  endDate: string | null;
  transactionType: TransactionType | null;
  accountType: AccountType | null;
}

export type FilterContext = 'dashboard' | 'reports' | 'expenses';

type FiltersByContext = Record<FilterContext, FilterState>;

interface UIStore {
  // Filters
  filters: FiltersByContext;
  currentFilterContext: FilterContext;
  setCurrentFilterContext: (context: FilterContext) => void;
  setAccountFilter: (context: FilterContext, accountId: number | null) => void;
  setTagFilter: (context: FilterContext, tagId: number | null) => void;
  setTagIdsFilter: (context: FilterContext, tagIds: number[]) => void;
  setCategoryFilter: (context: FilterContext, categoryId: number | null) => void;
  setDateRangeFilter: (context: FilterContext, startDate: string | null, endDate: string | null) => void;
  setTransactionTypeFilter: (context: FilterContext, type: TransactionType | null) => void;
  setAccountTypeFilter: (context: FilterContext, type: AccountType | null) => void;
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

const createInitialFilterState = (): FilterState => ({
  accountId: null,
  tagId: null,
  tagIds: [],
  categoryId: null,
  startDate: null,
  endDate: null,
  transactionType: null,
  accountType: null,
});

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
          filters: updateFiltersForContext(state.filters, context, { accountId }),
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
          filters: updateFiltersForContext(state.filters, context, { categoryId }),
        })),
      setDateRangeFilter: (context, startDate, endDate) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, { startDate, endDate }),
        })),
      setTransactionTypeFilter: (context, transactionType) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, { transactionType }),
        })),
      setAccountTypeFilter: (context, accountType) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, { accountType }),
        })),
      clearFilters: (context) =>
        set((state) => ({
          filters: updateFiltersForContext(state.filters, context, createInitialFilterState()),
        })),

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
        
        return {
          ...currentState,
          ...persisted,
          filters: normalizedFilters,
        };
      },
    }
  )
);

