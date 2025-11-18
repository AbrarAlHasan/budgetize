import { DatePicker, DatePickerRef } from "@/components/date-picker";
import { TagChip } from "@/components/tag-chip";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
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
  const setAccountFilter = useUIStore((state) => state.setAccountFilter);
  const setTagFilter = useUIStore((state) => state.setTagFilter);
  const setCategoryFilter = useUIStore((state) => state.setCategoryFilter);
  const setDateRangeFilter = useUIStore((state) => state.setDateRangeFilter);
  const setTransactionTypeFilter = useUIStore(
    (state) => state.setTransactionTypeFilter
  );
  const setAccountTypeFilter = useUIStore(
    (state) => state.setAccountTypeFilter
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
        { label: "All Types", value: "all" },
        { label: "Expense", value: "expense" },
        { label: "Income", value: "income" },
      ]
    : [
        { label: "All Types", value: "all" },
        { label: "Expense", value: "expense" },
      ];

  const accountTypeOptions = [
    { label: "All Account Types", value: "all" },
    { label: "Debit", value: "debit" },
    { label: "Credit", value: "credit" },
    { label: "Borrowed", value: "borrowed" },
    { label: "Lent", value: "lent" },
  ];

  const categoryOptions = [
    { label: "All Categories", value: "all" },
    ...(categories?.map((cat) => ({ label: cat.name, value: cat.id })) || []),
  ];

  const accountOptions = [
    { label: "All Accounts", value: "all" },
    ...(accounts?.map((acc) => ({ label: acc.name, value: acc.id })) || []),
  ];

  const handleApply = () => {
    // Update date filters
    if (startDate && endDate) {
      setDateRangeFilter(
        filterContext,
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );
    } else if (startDate) {
      setDateRangeFilter(filterContext, format(startDate, "yyyy-MM-dd"), null);
    } else if (endDate) {
      setDateRangeFilter(filterContext, null, format(endDate, "yyyy-MM-dd"));
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
    filters.accountId !== null ||
    filters.tagId !== null ||
    filters.categoryId !== null ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.transactionType !== null ||
    filters.accountType !== null;

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
              <BottomSheetSelect
                options={transactionTypeOptions}
                value={filters.transactionType || "all"}
                onValueChange={(value) => {
                  setTransactionTypeFilter(
                      filterContext,
                    value === "all" ? null : (value as TransactionType)
                  );
                }}
                placeholder="Select transaction type"
              />
            </Card>

            {/* Account */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Account
              </Text>
              <BottomSheetSelect
                options={accountOptions}
                value={filters.accountId || "all"}
                onValueChange={(value) => {
                    setAccountFilter(
                      filterContext,
                      value === "all" ? null : (value as number)
                    );
                }}
                placeholder="Select account"
              />
            </Card>

            {/* Account Type */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Account Type
              </Text>
              <BottomSheetSelect
                options={accountTypeOptions}
                value={filters.accountType || "all"}
                onValueChange={(value) => {
                  setAccountTypeFilter(
                      filterContext,
                    value === "all" ? null : (value as AccountType)
                  );
                }}
                placeholder="Select account type"
              />
            </Card>

            {/* Category */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Category
              </Text>
              <BottomSheetSelect
                options={categoryOptions}
                value={filters.categoryId || "all"}
                onValueChange={(value) => {
                  setCategoryFilter(
                    filterContext,
                    value === "all" ? null : (value as number)
                  );
                }}
                placeholder="Select category"
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
                      selected={filters.tagId === tag.id}
                      onPress={() => {
                          setTagFilter(
                            filterContext,
                            filters.tagId === tag.id ? null : tag.id
                          );
                      }}
                    />
                  ))}
                </View>
              </Card>
            )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" style={{ paddingBottom: 20 }}>
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
