import { DatePicker, DatePickerRef } from "@/components/date-picker";
import { TagChip } from "@/components/tag-chip";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { BottomSheetMultiSelect } from "@/components/ui/bottom-sheet-multi-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountType, TransactionType } from "@/db/schema/types";
import { useAccounts } from "@/hooks/queries/use-accounts";
import { useCategories } from "@/hooks/queries/use-categories";
import { useTags } from "@/hooks/queries/use-tags";
import { useUIStore, type FilterContext } from "@/store/ui-store";
import { useSettingsStore } from "@/store/settings-store";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

const FILTER_CONTEXTS: FilterContext[] = ["dashboard", "reports", "expenses"];

const resolveFilterContext = (
  context?: string | string[],
  fallback: FilterContext = "dashboard"
): FilterContext => {
  const value = Array.isArray(context) ? context[0] : context;
  if (value && FILTER_CONTEXTS.includes(value as FilterContext)) {
    return value as FilterContext;
  }
  return fallback;
};

export default function FiltersScreen() {
  const params = useLocalSearchParams<{ context?: string }>();
  const currentFilterContext = useUIStore((state) => state.currentFilterContext);
  const filterContext = resolveFilterContext(params.context, currentFilterContext);
  const filters = useUIStore((state) => state.filters[filterContext]);
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);
  const setAccountIdsFilter = useUIStore((state) => state.setAccountIdsFilter);
  const setTagIdsFilter = useUIStore((state) => state.setTagIdsFilter);
  const setCategoryIdsFilter = useUIStore((state) => state.setCategoryIdsFilter);
  const setDateRangeFilter = useUIStore((state) => state.setDateRangeFilter);
  const setTransactionTypesFilter = useUIStore(
    (state) => state.setTransactionTypesFilter
  );
  const setAccountTypesFilter = useUIStore(
    (state) => state.setAccountTypesFilter
  );
  const clearFilters = useUIStore((state) => state.clearFilters);

  const { data: accounts } = useAccounts();
  const { data: tags } = useTags();
  const { data: categories } = useCategories();

  // Ref for end date picker to open it automatically
  const endDatePickerRef = useRef<DatePickerRef>(null);

  // Local state for date pickers
  const [startDate, setStartDate] = useState<Date | null>(
    filters.startDate ? new Date(filters.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    filters.endDate ? new Date(filters.endDate) : null
  );

  // Update local state when filters change
  useEffect(() => {
    if (filters.startDate) {
      setStartDate(new Date(filters.startDate));
    } else {
      setStartDate(null);
    }
    if (filters.endDate) {
      setEndDate(new Date(filters.endDate));
    } else {
      setEndDate(null);
    }
  }, [filters.startDate, filters.endDate]);

  const transactionTypeOptions = settings.incomeCalculationEnabled
    ? [
        { label: "Expense", value: "expense" },
        { label: "Income", value: "income" },
      ]
    : [
        { label: "Expense", value: "expense" },
      ];

  const accountTypeOptions = [
    { label: "Debit", value: "debit" },
    { label: "Credit", value: "credit" },
    { label: "Borrowed", value: "borrowed" },
    { label: "Lent", value: "lent" },
  ];

  const categoryOptions = categories?.map((cat) => ({ label: cat.name, value: cat.id })) || [];

  const accountOptions = accounts?.map((acc) => ({ label: acc.name, value: acc.id })) || [];

  const handleApply = () => {
    // Update date filters
    // If only one date is selected, use it for both start and end to filter for that single day
    if (startDate && endDate) {
      setDateRangeFilter(
        filterContext,
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );
    } else if (startDate) {
      // If only start date is selected, use it for both start and end
      const dateStr = format(startDate, "yyyy-MM-dd");
      setDateRangeFilter(filterContext, dateStr, dateStr);
    } else if (endDate) {
      // If only end date is selected, use it for both start and end
      const dateStr = format(endDate, "yyyy-MM-dd");
      setDateRangeFilter(filterContext, dateStr, dateStr);
    } else {
      setDateRangeFilter(filterContext, null, null);
    }
    router.back();
  };

  const handleClear = () => {
    clearFilters(filterContext);
    setStartDate(null);
    setEndDate(null);
  };

  const handleQuickFilter = (type: "today" | "week" | "month" | "year") => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (type) {
      case "today":
        start = today;
        break;
      case "week":
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case "month":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "year":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
    }

    setStartDate(start);
    setEndDate(end);
  };

  const hasActiveFilters =
    (filters.accountIds && filters.accountIds.length > 0) ||
    (filters.tagIds && filters.tagIds.length > 0) ||
    (filters.categoryIds && filters.categoryIds.length > 0) ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    (filters.transactionTypes && filters.transactionTypes.length > 0) ||
    (filters.accountTypes && filters.accountTypes.length > 0);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Filters",
          headerBackTitle: "Back",
        }}
        />
      {/* <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}> */}
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View className="p-4">
            {/* Quick Date Filters */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Quick Filters
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="flex-1 min-w-[45%]">
                  <Button
                    variant="outline"
                    onPress={() => handleQuickFilter("today")}
                  >
                    Today
                  </Button>
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Button
                    variant="outline"
                    onPress={() => handleQuickFilter("week")}
                  >
                    Last 7 Days
                  </Button>
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Button
                    variant="outline"
                    onPress={() => handleQuickFilter("month")}
                  >
                    This Month
                  </Button>
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Button
                    variant="outline"
                    onPress={() => handleQuickFilter("year")}
                  >
                    This Year
                  </Button>
                </View>
              </View>
            </Card>

            {/* Date Range */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Date Range
              </Text>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  // If end date is before new start date, clear it
                  if (endDate && date && date > endDate) {
                    setEndDate(null);
                  }
                  // If no end date is set, automatically set it to the same date for single-day filtering
                  if (!endDate && date) {
                    setEndDate(date);
                  }
                  // Automatically open end date picker after start date is selected
                  setTimeout(() => {
                    endDatePickerRef.current?.open();
                  }, 300);
                }}
              />
              <DatePicker
                ref={endDatePickerRef}
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                minDate={startDate || undefined}
              />
            </Card>

            {/* Transaction Type */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Transaction Type
              </Text>
              <BottomSheetMultiSelect
                options={transactionTypeOptions}
                value={filters.transactionTypes || []}
                onValueChange={(values) => {
                  setTransactionTypesFilter(
                    filterContext,
                    values as TransactionType[]
                  );
                }}
                placeholder="Select transaction types"
              />
            </Card>

            {/* Account */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Account
              </Text>
              <BottomSheetMultiSelect
                options={accountOptions}
                value={filters.accountIds || []}
                onValueChange={(values) => {
                  setAccountIdsFilter(
                    filterContext,
                    values as number[]
                  );
                }}
                placeholder="Select accounts"
              />
            </Card>

            {/* Account Type */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Account Type
              </Text>
              <BottomSheetMultiSelect
                options={accountTypeOptions}
                value={filters.accountTypes || []}
                onValueChange={(values) => {
                  setAccountTypesFilter(
                    filterContext,
                    values as AccountType[]
                  );
                }}
                placeholder="Select account types"
              />
            </Card>

            {/* Category */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Category
              </Text>
              <BottomSheetMultiSelect
                options={categoryOptions}
                value={filters.categoryIds || []}
                onValueChange={(values) => {
                  setCategoryIdsFilter(
                    filterContext,
                    values as number[]
                  );
                }}
                placeholder="Select categories"
              />
            </Card>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <Card className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Tags
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {tags.map((tag) => (
                    <TagChip
                      key={tag.id}
                      name={tag.name}
                      selected={(filters.tagIds || []).includes(tag.id)}
                      onPress={() => {
                        const currentTagIds = filters.tagIds || [];
                        const newTagIds = currentTagIds.includes(tag.id)
                          ? currentTagIds.filter((id) => id !== tag.id)
                          : [...currentTagIds, tag.id];
                        setTagIdsFilter(filterContext, newTagIds);
                      }}
                    />
                  ))}
                </View>
              </Card>
            )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" style={{ paddingBottom: 20 }}>
            <View className="p-4">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    variant="outline"
                    onPress={handleClear}
                    disabled={!hasActiveFilters}
                  >
                    Clear All
                  </Button>
                </View>
                <View className="flex-1">
                  <Button onPress={handleApply}>Apply Filters</Button>
                </View>
              </View>
            </View>
          </View>
        </View>
      {/* </SafeAreaView> */}
    </>
  );
}
