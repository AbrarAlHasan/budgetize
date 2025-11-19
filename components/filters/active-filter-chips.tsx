import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { useUIStore, type FilterContext } from '@/store/ui-store';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { useCategories } from '@/hooks/queries/use-categories';
import { useTags } from '@/hooks/queries/use-tags';

interface ActiveFilterChipsProps {
  context: FilterContext;
}

interface ChipItem {
  key: string;
  text: string;
  onRemove: () => void;
}

export function ActiveFilterChips({ context }: ActiveFilterChipsProps) {
  const filters = useUIStore((state) => state.filters[context]);
  const setAccountIdsFilter = useUIStore((state) => state.setAccountIdsFilter);
  const setCategoryIdsFilter = useUIStore((state) => state.setCategoryIdsFilter);
  const setTagIdsFilter = useUIStore((state) => state.setTagIdsFilter);
  const setTransactionTypesFilter = useUIStore((state) => state.setTransactionTypesFilter);
  const setAccountTypesFilter = useUIStore((state) => state.setAccountTypesFilter);
  const setDateRangeFilter = useUIStore((state) => state.setDateRangeFilter);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const chips = useMemo<ChipItem[]>(() => {
    const items: ChipItem[] = [];

    if (filters.accountIds?.length) {
      filters.accountIds.forEach((id) => {
        const name = accounts?.find((acc) => acc.id === id)?.name ?? `Account ${id}`;
        items.push({
          key: `account-${id}`,
          text: `Account: ${name}`,
          onRemove: () => {
            const updated = filters.accountIds?.filter((accId) => accId !== id) ?? [];
            setAccountIdsFilter(context, updated);
          },
        });
      });
    }

    if (filters.categoryIds?.length) {
      filters.categoryIds.forEach((id) => {
        const name = categories?.find((cat) => cat.id === id)?.name ?? `Category ${id}`;
        items.push({
          key: `category-${id}`,
          text: `Category: ${name}`,
          onRemove: () => {
            const updated = filters.categoryIds?.filter((catId) => catId !== id) ?? [];
            setCategoryIdsFilter(context, updated);
          },
        });
      });
    }

    if (filters.tagIds?.length) {
      filters.tagIds.forEach((id) => {
        const name = tags?.find((tag) => tag.id === id)?.name ?? `Tag ${id}`;
        items.push({
          key: `tag-${id}`,
          text: `Tag: ${name}`,
          onRemove: () => {
            const updated = filters.tagIds?.filter((tagId) => tagId !== id) ?? [];
            setTagIdsFilter(context, updated);
          },
        });
      });
    }

    if (filters.transactionTypes?.length) {
      filters.transactionTypes.forEach((type) => {
        items.push({
          key: `type-${type}`,
          text: `Type: ${capitalize(type)}`,
          onRemove: () => {
            const updated = filters.transactionTypes?.filter((t) => t !== type) ?? [];
            setTransactionTypesFilter(context, updated);
          },
        });
      });
    }

    if (filters.accountTypes?.length) {
      filters.accountTypes.forEach((type) => {
        items.push({
          key: `account-type-${type}`,
          text: `Account Type: ${capitalize(type)}`,
          onRemove: () => {
            const updated = filters.accountTypes?.filter((t) => t !== type) ?? [];
            setAccountTypesFilter(context, updated);
          },
        });
      });
    }

    if (filters.startDate || filters.endDate) {
      const formatDate = (date?: string | null) =>
        date ? format(new Date(date), 'dd MMM yyyy') : '';
      const label =
        filters.startDate && filters.endDate
          ? `${formatDate(filters.startDate)} → ${formatDate(filters.endDate)}`
          : filters.startDate
            ? `From ${formatDate(filters.startDate)}`
            : `Until ${formatDate(filters.endDate)}`;

      items.push({
        key: 'date-range',
        text: `Date: ${label}`,
        onRemove: () => setDateRangeFilter(context, null, null),
      });
    }

    return items;
  }, [
    accounts,
    categories,
    tags,
    filters.accountIds,
    filters.categoryIds,
    filters.tagIds,
    filters.transactionTypes,
    filters.accountTypes,
    filters.startDate,
    filters.endDate,
    context,
    setAccountIdsFilter,
    setCategoryIdsFilter,
    setTagIdsFilter,
    setTransactionTypesFilter,
    setAccountTypesFilter,
    setDateRangeFilter,
  ]);

  if (chips.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-4"
      contentContainerStyle={{ gap: 8 }}
    >
      {chips.map((chip) => (
        <View
          key={chip.key}
          className="flex-row items-center bg-gray-200 dark:bg-gray-800 rounded-full px-3 py-1.5"
        >
          <Text className="text-sm text-gray-800 dark:text-gray-100 mr-2">{chip.text}</Text>
          <TouchableOpacity onPress={chip.onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);


