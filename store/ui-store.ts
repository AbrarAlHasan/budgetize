import { create } from 'zustand';
import { AccountType, TransactionType } from '@/db/schema/types';

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

interface UIStore {
  // Filters
  filters: FilterState;
  setAccountFilter: (accountId: number | null) => void;
  setTagFilter: (tagId: number | null) => void;
  setTagIdsFilter: (tagIds: number[]) => void;
  setCategoryFilter: (categoryId: number | null) => void;
  setDateRangeFilter: (startDate: string | null, endDate: string | null) => void;
  setTransactionTypeFilter: (type: TransactionType | null) => void;
  setAccountTypeFilter: (type: AccountType | null) => void;
  clearFilters: () => void;

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

const initialFilters: FilterState = {
  accountId: null,
  tagId: null,
  tagIds: [],
  categoryId: null,
  startDate: null,
  endDate: null,
  transactionType: null,
  accountType: null,
};

export const useUIStore = create<UIStore>((set) => ({
  // Filters
  filters: initialFilters,
  setAccountFilter: (accountId) =>
    set((state) => ({
      filters: { ...state.filters, accountId },
    })),
  setTagFilter: (tagId) =>
    set((state) => ({
      filters: { ...state.filters, tagId, tagIds: tagId ? [tagId] : [] },
    })),
  setTagIdsFilter: (tagIds) =>
    set((state) => ({
      filters: { ...state.filters, tagIds, tagId: tagIds.length === 1 ? tagIds[0] : null },
    })),
  setCategoryFilter: (categoryId) =>
    set((state) => ({
      filters: { ...state.filters, categoryId },
    })),
  setDateRangeFilter: (startDate, endDate) =>
    set((state) => ({
      filters: { ...state.filters, startDate, endDate },
    })),
  setTransactionTypeFilter: (transactionType) =>
    set((state) => ({
      filters: { ...state.filters, transactionType },
    })),
  setAccountTypeFilter: (accountType) =>
    set((state) => ({
      filters: { ...state.filters, accountType },
    })),
  clearFilters: () =>
    set({
      filters: initialFilters,
    }),

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
}));

