import { DatePicker, DatePickerRef } from "@/components/date-picker";
import { Card } from "@/components/ui/card";
import { AccountType } from "@/db/schema/types";
import {
  useAccount,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/hooks/queries/use-accounts";
import { useSettingsStore } from "@/store/settings-store";
import { getCurrencySymbol } from "@/utils/currencies";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { parseISO } from "date-fns";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddAccountScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  const accountId = params.id ? parseInt(params.id, 10) : null;
  const isEditMode = !!accountId;
  const insets = useSafeAreaInsets();

  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const { data: account, isLoading: isLoadingAccount } = useAccount(
    accountId || 0
  );

  const originLabel = params.from ?? "Back";
  const { settings, loadSettings } = useSettingsStore();

  const nameInputRef = useRef<TextInput>(null);
  const bankNameInputRef = useRef<TextInput>(null);
  const creditLimitInputRef = useRef<TextInput>(null);
  const billingStartDateRef = useRef<DatePickerRef>(null);
  const billingEndDateRef = useRef<DatePickerRef>(null);
  const paymentDueDateRef = useRef<DatePickerRef>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("debit");
  const [bankName, setBankName] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [billingStartDate, setBillingStartDate] = useState<Date | null>(null);
  const [billingEndDate, setBillingEndDate] = useState<Date | null>(null);
  const [paymentDueDate, setPaymentDueDate] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  // Load account data in edit mode
  useEffect(() => {
    if (account && isEditMode) {
      setName(account.name);
      setType(account.type);
      setBankName(account.bank_name || "");
      setCreditLimit(account.credit_limit?.toString() || "");
      setBillingStartDate(
        account.billing_start_date ? parseISO(account.billing_start_date) : null
      );
      setBillingEndDate(
        account.billing_end_date ? parseISO(account.billing_end_date) : null
      );
      setPaymentDueDate(
        account.payment_due_date ? parseISO(account.payment_due_date) : null
      );
    }
  }, [account, isEditMode]);

  // Update header color based on account type
  useEffect(() => {
    const headerColor = getAccountTypeColor(type);
    navigation.setOptions({
      headerStyle: {
        backgroundColor: headerColor,
      },
      headerTintColor: "#FFFFFF",
    });
  }, [type, navigation]);

  const getAccountTypeColor = (accountType: AccountType): string => {
    switch (accountType) {
      case "debit":
        return "#3B82F6"; // Blue
      case "credit":
        return "#A855F7"; // Purple
      case "borrowed":
        return "#F97316"; // Orange
      case "lent":
        return "#10B981"; // Green
      default:
        return "#3B82F6";
    }
  };

  const primaryColor = getAccountTypeColor(type);

  // Show loading state in edit mode
  if (isEditMode && isLoadingAccount) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Show not found state in edit mode
  if (isEditMode && !account) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <Text className="text-gray-500 dark:text-gray-400">
          Account not found
        </Text>
      </View>
    );
  }

  const handleBlurInput = () => {
    nameInputRef.current?.blur();
    bankNameInputRef.current?.blur();
    creditLimitInputRef.current?.blur();
  };

  const handleCreditLimitChange = (text: string) => {
    // Only allow numbers and one decimal point
    const numericRegex = /^\d*\.?\d*$/;
    if (text === "" || numericRegex.test(text)) {
      setCreditLimit(text);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Account name is required");
      return;
    }

    try {
      if (isEditMode && accountId) {
        await updateAccount.mutateAsync({
          id: accountId,
          name: name.trim(),
          type,
          bank_name: bankName.trim() || null,
          credit_limit: creditLimit ? parseFloat(creditLimit) : null,
          billing_start_date: billingStartDate?.toISOString() || null,
          billing_end_date: billingEndDate?.toISOString() || null,
          payment_due_date: paymentDueDate?.toISOString() || null,
        });
        Alert.alert("Success", "Account updated successfully");
      } else {
        await createAccount.mutateAsync({
          name: name.trim(),
          type,
          bank_name: bankName.trim() || null,
          credit_limit: creditLimit ? parseFloat(creditLimit) : null,
          billing_start_date: billingStartDate?.toISOString() || null,
          billing_end_date: billingEndDate?.toISOString() || null,
          payment_due_date: paymentDueDate?.toISOString() || null,
        });
        Alert.alert("Success", "Account created successfully");
      }
      router.back();
    } catch (error) {
      Alert.alert(
        "Error",
        isEditMode ? "Failed to update account" : "Failed to create account"
      );
    }
  };

  const handleDelete = () => {
    if (!isEditMode || !accountId) return;

    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete this account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync(accountId);
              Alert.alert("Success", "Account deleted successfully");
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete account");
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: isEditMode ? "Edit Account" : "New Account",
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
          {/* Account Name Hero Section */}
          <TouchableWithoutFeedback onPress={handleBlurInput}>
            <View
              className="px-4 py-6"
              style={{
                minHeight: 120,
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
              }}
            >
              <TextInput
                ref={nameInputRef}
                value={name}
                onChangeText={setName}
                placeholder="Account Name"
                placeholderTextColor="#9CA3AF"
                multiline
                className="text-gray-400 dark:text-gray-500"
                style={{
                  fontSize: 48,
                  fontWeight: "700",
                  textAlign: "center",
                  textAlignVertical: "center",
                  width: "100%",
                  paddingHorizontal: 16,
                  flexWrap: "wrap",
                }}
              />
            </View>
          </TouchableWithoutFeedback>

          {/* Account Type Selector */}
          <View className="px-4 mb-6">
            <View className="flex-row flex-wrap gap-3">
              <TouchableOpacity
                onPress={() => {
                  handleBlurInput();
                  setType("debit");
                }}
                className={`flex-1 min-w-[45%] rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                  type === "debit"
                    ? "bg-blue-500 dark:bg-blue-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
                style={
                  type === "debit"
                    ? {
                        shadowColor: "#3B82F6",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      }
                    : {}
                }
              >
                <Ionicons
                  name="card"
                  size={24}
                  color={type === "debit" ? "#FFFFFF" : "#3B82F6"}
                />
                <Text
                  className={`font-bold text-base ${
                    type === "debit"
                      ? "text-white"
                      : "text-blue-500 dark:text-blue-400"
                  }`}
                >
                  Debit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  handleBlurInput();
                  setType("credit");
                }}
                className={`flex-1 min-w-[45%] rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                  type === "credit"
                    ? "bg-purple-500 dark:bg-purple-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
                style={
                  type === "credit"
                    ? {
                        shadowColor: "#A855F7",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      }
                    : {}
                }
              >
                <Ionicons
                  name="card-outline"
                  size={24}
                  color={type === "credit" ? "#FFFFFF" : "#A855F7"}
                />
                <Text
                  className={`font-bold text-base ${
                    type === "credit"
                      ? "text-white"
                      : "text-purple-500 dark:text-purple-400"
                  }`}
                >
                  Credit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  handleBlurInput();
                  setType("borrowed");
                }}
                className={`flex-1 min-w-[45%] rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                  type === "borrowed"
                    ? "bg-orange-500 dark:bg-orange-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
                style={
                  type === "borrowed"
                    ? {
                        shadowColor: "#F97316",
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
                  color={type === "borrowed" ? "#FFFFFF" : "#F97316"}
                />
                <Text
                  className={`font-bold text-base ${
                    type === "borrowed"
                      ? "text-white"
                      : "text-orange-500 dark:text-orange-400"
                  }`}
                >
                  Borrowed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  handleBlurInput();
                  setType("lent");
                }}
                className={`flex-1 min-w-[45%] rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                  type === "lent"
                    ? "bg-green-500 dark:bg-green-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
                style={
                  type === "lent"
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
                  color={type === "lent" ? "#FFFFFF" : "#10B981"}
                />
                <Text
                  className={`font-bold text-base ${
                    type === "lent"
                      ? "text-white"
                      : "text-green-500 dark:text-green-400"
                  }`}
                >
                  Lent
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Details Section */}
          <View className="px-4 mb-6">
            <Card className="p-0 overflow-hidden">
              <View className="p-5">
                {/* Bank Name */}
                <TouchableWithoutFeedback onPress={handleBlurInput}>
                  <View className="flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                    <View className="flex-row items-center flex-1">
                      <View className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mr-3">
                        <Ionicons name="business" size={24} color="#6366F1" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                          Bank Name (Optional)
                        </Text>
                        <TextInput
                          ref={bankNameInputRef}
                          value={bankName}
                          onChangeText={setBankName}
                          placeholder="Enter bank name"
                          placeholderTextColor="#9CA3AF"
                          className="text-base font-semibold text-gray-900 dark:text-gray-100"
                          style={{ minHeight: 24 }}
                        />
                      </View>
                    </View>
                  </View>
                </TouchableWithoutFeedback>

                {/* Credit Limit - Only for credit cards */}
                {type === "credit" && (
                  <TouchableWithoutFeedback onPress={handleBlurInput}>
                    <View className="flex-row items-center justify-between py-4">
                      <View className="flex-row items-center flex-1">
                        <View className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-3">
                          <Ionicons name="cash" size={24} color="#A855F7" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                            Credit Limit
                          </Text>
                          <View className="flex-row items-center">
                            <Text className="text-gray-400 dark:text-gray-500 text-base font-light mr-1">
                              {getCurrencySymbol(settings.currency || "INR")}
                            </Text>
                            <TextInput
                              ref={creditLimitInputRef}
                              value={creditLimit}
                              onChangeText={handleCreditLimitChange}
                              placeholder="0.00"
                              placeholderTextColor="#9CA3AF"
                              keyboardType="numeric"
                              className="text-base font-semibold text-gray-900 dark:text-gray-100"
                              style={{ flex: 1, minHeight: 24 }}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                )}
              </View>
            </Card>
          </View>

          {/* Credit Card Dates Section */}
          {type === "credit" && (
            <View className="px-4 mb-6">
              <Card className="p-5">
                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide font-semibold">
                  Billing Cycle
                </Text>

                <View className="mb-4">
                  <TouchableOpacity
                    onPress={() => {
                      handleBlurInput();
                      billingStartDateRef.current?.open();
                    }}
                    className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800"
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#6B7280"
                      />
                      <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2 uppercase tracking-wide">
                        Billing Start Date
                      </Text>
                    </View>
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {billingStartDate
                        ? new Date(billingStartDate).toLocaleDateString()
                        : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <TouchableOpacity
                    onPress={() => {
                      handleBlurInput();
                      billingEndDateRef.current?.open();
                    }}
                    className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800"
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#6B7280"
                      />
                      <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2 uppercase tracking-wide">
                        Billing End Date
                      </Text>
                    </View>
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {billingEndDate
                        ? new Date(billingEndDate).toLocaleDateString()
                        : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View>
                  <TouchableOpacity
                    onPress={() => {
                      handleBlurInput();
                      paymentDueDateRef.current?.open();
                    }}
                    className="flex-row items-center justify-between py-3"
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons name="time-outline" size={20} color="#6B7280" />
                      <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2 uppercase tracking-wide">
                        Payment Due Date
                      </Text>
                    </View>
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {paymentDueDate
                        ? new Date(paymentDueDate).toLocaleDateString()
                        : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Action Buttons */}
      <View 
        className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {isEditMode ? (
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleteAccount.isPending}
              style={{
                flex: 1,
                backgroundColor: "#EF4444",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#EF4444",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              {deleteAccount.isPending ? (
                <Text className="text-white font-bold text-lg">
                  Deleting...
                </Text>
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                  <Text className="text-white font-bold text-base ml-2">
                    Delete
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={updateAccount.isPending}
              style={{
                flex: 1,
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
              {updateAccount.isPending ? (
                <Text className="text-white font-bold text-lg">Saving...</Text>
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text className="text-white font-bold text-lg ml-2">
                    Save
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleSave}
            disabled={createAccount.isPending}
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
            {createAccount.isPending ? (
              <Text className="text-white font-bold text-lg">Creating...</Text>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text className="text-white font-bold text-lg ml-2">
                  Create Account
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Hidden Date Pickers */}
      <View style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>
        <DatePicker
          ref={billingStartDateRef}
          label="Billing Start Date"
          value={billingStartDate}
          onChange={(date) => setBillingStartDate(date)}
        />
        <DatePicker
          ref={billingEndDateRef}
          label="Billing End Date"
          value={billingEndDate}
          onChange={(date) => setBillingEndDate(date)}
        />
        <DatePicker
          ref={paymentDueDateRef}
          label="Payment Due Date"
          value={paymentDueDate}
          onChange={(date) => setPaymentDueDate(date)}
        />
      </View>
    </View>
  );
}
