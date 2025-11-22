import {
  AddTagBottomSheet,
  AddTagBottomSheetRef,
} from "@/components/add-tag-bottom-sheet";
import { DatePicker } from "@/components/date-picker";
import { TagChip } from "@/components/tag-chip";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Card } from "@/components/ui/card";
import { TransactionType } from "@/db/schema/types";
import { useAccounts } from "@/hooks/queries/use-accounts";
import { useCategories } from "@/hooks/queries/use-categories";
import { useTags } from "@/hooks/queries/use-tags";
import { useCreateTransaction } from "@/hooks/queries/use-transactions";
import { useSettingsStore } from "@/store/settings-store";
import { getCurrencySymbol } from "@/utils/currencies";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function AddTransactionScreen() {
  const navigation = useNavigation();
  const createTransaction = useCreateTransaction();
  const { data: accounts } = useAccounts();
  const { data: tags } = useTags();
  const { data: categories } = useCategories();

  // Refs for bottom sheet selects
  const typeSelectRef = useRef<any>(null);
  const accountSelectRef = useRef<any>(null);
  const categorySelectRef = useRef<any>(null);
  const datePickerRef = useRef<any>(null);
  const addTagBottomSheetRef = useRef<AddTagBottomSheetRef>(null);
  const amountInputRef = useRef<TextInput>(null);

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const params = useLocalSearchParams<{ from?: string }>();
  const originLabel = params.from ?? "Back";
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  // Update header color based on transaction type
  useEffect(() => {
    const headerColor = type === "expense" ? "#EF4444" : "#10B981";
    navigation.setOptions({
      headerStyle: {
        backgroundColor: headerColor,
      },
      headerTintColor: "#FFFFFF",
    });
  }, [type, navigation]);

  const transactionTypeOptions = settings.incomeCalculationEnabled
    ? [
        { label: "Expense", value: "expense" },
        { label: "Income", value: "income" },
      ]
    : [{ label: "Expense", value: "expense" }];

  const accountOptions =
    accounts?.map((acc) => ({ label: acc.name, value: acc.id })) || [];

  const categoryOptions = [
    { label: "No Category", value: "none" },
    ...(categories?.map((cat) => ({ label: cat.name, value: cat.id })) || []),
  ];

  const handleSave = async () => {
    if (!amount.trim()) {
      Alert.alert("Error", "Amount is required");
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!accountId) {
      Alert.alert("Error", "Please select an account");
      return;
    }

    if (!paymentMode.trim()) {
      Alert.alert("Error", "Payment mode is required");
      return;
    }

    try {
      // Combine selected date with current time and convert to ISO string
      const selectedDateWithTime = new Date(date);
      const now = new Date();
      selectedDateWithTime.setHours(now.getHours());
      selectedDateWithTime.setMinutes(now.getMinutes());
      selectedDateWithTime.setSeconds(now.getSeconds());
      selectedDateWithTime.setMilliseconds(now.getMilliseconds());

      await createTransaction.mutateAsync({
        account_id: accountId,
        category_id: categoryId,
        amount: amountValue,
        type,
        date: selectedDateWithTime.toISOString(),
        note: note.trim() || null,
        payment_mode: paymentMode.trim(),
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      Alert.alert("Success", "Transaction created successfully");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to create transaction");
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleTagCreated = (tagId: number) => {
    setSelectedTagIds((prev) => [...prev, tagId]);
  };

  const handleOpenAddTag = () => {
    addTagBottomSheetRef.current?.present();
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and one decimal point
    const numericRegex = /^\d*\.?\d*$/;
    if (text === '' || numericRegex.test(text)) {
      setAmount(text);
    }
  };

  const handleBlurAmount = () => {
    amountInputRef.current?.blur();
  };

  const selectedAccount = accounts?.find((acc) => acc.id === accountId);
  const selectedCategory = categories?.find((cat) => cat.id === categoryId);

  // Dynamic colors based on transaction type
  const primaryColor = type === "expense" ? "#EF4444" : "#10B981";

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "New Transaction",
          headerBackTitle: originLabel,
          headerStyle: {
            backgroundColor: primaryColor,
          },
          headerTintColor: "#FFFFFF",
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type Selector */}
          {settings.incomeCalculationEnabled && (
            <View className="px-4 pt-6 mb-6">
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    handleBlurAmount();
                    setType("expense");
                  }}
                  className={`flex-1 rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                    type === "expense"
                      ? "bg-red-500 dark:bg-red-600"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }`}
                  style={
                    type === "expense"
                      ? {
                          shadowColor: "#EF4444",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 4,
                        }
                      : {}
                  }
                >
                  <Ionicons
                    name="arrow-down-circle"
                    size={24}
                    color={type === "expense" ? "#FFFFFF" : "#EF4444"}
                  />
                  <Text
                    className={`font-bold text-base ${
                      type === "expense"
                        ? "text-white"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    handleBlurAmount();
                    setType("income");
                  }}
                  className={`flex-1 rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                    type === "income"
                      ? "bg-green-500 dark:bg-green-600"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }`}
                  style={
                    type === "income"
                      ? {
                          shadowColor: "#10B981",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 4,
                        }
                      : {}
                  }
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={24}
                    color={type === "income" ? "#FFFFFF" : "#10B981"}
                  />
                  <Text
                    className={`font-bold text-base ${
                      type === "income"
                        ? "text-white"
                        : "text-green-500 dark:text-green-400"
                    }`}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Hero Amount Section */}
          <TouchableWithoutFeedback onPress={handleBlurAmount}>
            <View
              className="px-4 py-6"
              style={{
                minHeight: 120,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                className="flex-row items-center justify-center"
                style={{ width: "100%", maxWidth: "100%" }}
              >
                {/* Currency Symbol */}
                <Text 
                  className="text-gray-400 dark:text-gray-500 text-4xl font-medium mr-2"
                  style={{ flexShrink: 0 }}
                >
                  {getCurrencySymbol(settings.currency || "INR")}
                </Text>

                {/* Amount Input */}
                <TextInput
                  ref={amountInputRef}
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  className="text-gray-400 dark:text-gray-500"
                  style={{ 
                    fontSize: 48,
                    fontWeight: '700',
                    textAlign: 'center',
                    minWidth: 120,
                  }}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>

          {/* Quick Details Section */}
          <View className="px-4 mb-6">
            <Card className="p-0 overflow-hidden">
              <View className="p-5">
                {/* Account */}
                <TouchableOpacity
                  onPress={() => {
                    handleBlurAmount();
                    accountSelectRef.current?.present();
                  }}
                  className="flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800"
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                      <Ionicons name="wallet" size={24} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Account
                      </Text>
                      <Text
                        className={`text-base font-semibold ${
                          selectedAccount
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {selectedAccount?.name || "Select account"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Category */}
                <TouchableOpacity
                  onPress={() => {
                    handleBlurAmount();
                    categorySelectRef.current?.present();
                  }}
                  className="flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800"
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-3">
                      <Ionicons name="pricetag" size={24} color="#A855F7" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Category
                      </Text>
                      <Text
                        className={`text-base font-semibold ${
                          selectedCategory
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {selectedCategory?.name || "No category"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Date */}
                <TouchableOpacity
                  onPress={() => {
                    handleBlurAmount();
                    datePickerRef.current?.open();
                  }}
                  className="flex-row items-center justify-between py-4"
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 items-center justify-center mr-3">
                      <Ionicons name="calendar" size={24} color="#F97316" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Date
                      </Text>
                      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {format(date, "MMM dd, yyyy")}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </Card>
          </View>

          {/* Additional Details Section */}
          <View className="px-4 mb-6">
            <Card className="p-5">
              <Text className="text-xs text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide font-semibold">
                Additional Details
              </Text>

              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="card" size={16} color="#6B7280" />
                  <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2 uppercase tracking-wide">
                    Payment Mode
                  </Text>
                </View>
                <TextInput
                  value={paymentMode}
                  onChangeText={setPaymentMode}
                  placeholder="Cash, Card, UPI..."
                  placeholderTextColor="#9CA3AF"
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                />
              </View>

              <View>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="document-text" size={16} color="#6B7280" />
                  <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2 uppercase tracking-wide">
                    Note (Optional)
                  </Text>
                </View>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                  style={{ minHeight: 80, textAlignVertical: "top" }}
                />
              </View>
            </Card>
          </View>

          {/* Tags Section */}
          <View className="px-4 mb-6">
            <Card className="p-5">
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="pricetags" size={20} color="#6B7280" />
                  <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2 uppercase tracking-wide font-semibold">
                    Tags
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleOpenAddTag}
                  className="flex-row items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg"
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color="#3B82F6" />
                  <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Add
                  </Text>
                </TouchableOpacity>
              </View>

              {tags && tags.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {tags.map((tag) => (
                    <TagChip
                      key={tag.id}
                      name={tag.name}
                      selected={selectedTagIds.includes(tag.id)}
                      onPress={() => toggleTag(tag.id)}
                    />
                  ))}
                </View>
              ) : (
                <View className="py-4 items-center">
                  <Ionicons
                    name="pricetags-outline"
                    size={32}
                    color="#9CA3AF"
                  />
                  <Text className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    No tags yet
                  </Text>
                </View>
              )}
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Save Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800">
        <TouchableOpacity
          key={`save-${type}`} // Force re-render when type changes
          onPress={handleSave}
          disabled={createTransaction.isPending}
          style={{
            backgroundColor: primaryColor,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {createTransaction.isPending ? (
            <View className="flex-row items-center">
              <Text className="text-white font-bold text-lg mr-2">
                Creating...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text className="text-white font-bold text-lg ml-2">
                Create Transaction
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Hidden Components for Bottom Sheets */}
      <View style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>
        <BottomSheetSelect
          ref={accountSelectRef}
          label="Account"
          options={accountOptions}
          value={accountId}
          onValueChange={(value) => setAccountId(value as number)}
          placeholder="Select an account"
        />
        <BottomSheetSelect
          ref={categorySelectRef}
          label="Category"
          options={categoryOptions}
          value={categoryId || "none"}
          onValueChange={(value) =>
            setCategoryId(value === "none" ? null : (value as number))
          }
          placeholder="Select a category"
        />
        <DatePicker
          ref={datePickerRef}
          label="Date"
          value={date}
          onChange={setDate}
        />
      </View>

      {/* Add Tag Bottom Sheet */}
      <AddTagBottomSheet
        ref={addTagBottomSheetRef}
        onTagCreated={handleTagCreated}
      />
    </View>
  );
}
