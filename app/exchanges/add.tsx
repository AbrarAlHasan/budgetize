import { DatePicker, DatePickerRef } from "@/components/date-picker";
import { Card } from "@/components/ui/card";
import { ExchangeType } from "@/db/schema/types";
import {
  useCreateExchange,
  useDeleteExchange,
  useExchange,
  useUpdateExchange,
} from "@/hooks/queries/use-exchanges";
import { useSettingsStore } from "@/store/settings-store";
import { getCurrencySymbol } from "@/utils/currencies";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { Stack, router, useLocalSearchParams } from "expo-router";
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

export default function AddExchangeScreen() {
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  const exchangeId = params.id ? parseInt(params.id, 10) : null;
  const isEditMode = !!exchangeId;
  const originLabel = params.from ?? "Exchange";
  const insets = useSafeAreaInsets();

  const createExchange = useCreateExchange();
  const updateExchange = useUpdateExchange();
  const deleteExchange = useDeleteExchange();
  const { data: exchange, isLoading: isLoadingExchange } = useExchange(
    exchangeId || 0
  );

  const { settings } = useSettingsStore();
  const currencySymbol = getCurrencySymbol(settings?.currency || "INR");

  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<ExchangeType>("lent");
  const [date, setDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [note, setNote] = useState("");

  const datePickerRef = useRef<DatePickerRef>(null);
  const dueDatePickerRef = useRef<DatePickerRef>(null);
  const amountInputRef = useRef<TextInput>(null);
  const personNameInputRef = useRef<TextInput>(null);

  // Load exchange data in edit mode
  useEffect(() => {
    if (exchange && isEditMode) {
      setPersonName(exchange.person_name);
      setAmount(exchange.amount.toString());
      setType(exchange.type);
      setDate(parseISO(exchange.date));
      setDueDate(exchange.due_date ? parseISO(exchange.due_date) : null);
      setNote(exchange.note || "");
    }
  }, [exchange, isEditMode]);

  const handleSave = async () => {
    if (!personName.trim()) {
      Alert.alert("Error", "Person name is required");
      return;
    }

    if (!amount.trim()) {
      Alert.alert("Error", "Amount is required");
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      const dateString = format(date, "yyyy-MM-dd");
      const dueDateString = dueDate ? format(dueDate, "yyyy-MM-dd") : null;

      if (isEditMode && exchangeId) {
        await updateExchange.mutateAsync({
          id: exchangeId,
          person_name: personName.trim(),
          amount: amountValue,
          type,
          date: dateString,
          due_date: dueDateString,
          note: note.trim() || null,
        });
        Alert.alert("Success", "Exchange updated successfully");
      } else {
        await createExchange.mutateAsync({
          person_name: personName.trim(),
          amount: amountValue,
          type,
          date: dateString,
          due_date: dueDateString,
          note: note.trim() || null,
        });
        Alert.alert("Success", "Exchange created successfully");
      }
      router.back();
    } catch (error) {
      Alert.alert(
        "Error",
        isEditMode ? "Failed to update exchange" : "Failed to create exchange"
      );
    }
  };

  const handleDelete = () => {
    if (!isEditMode || !exchangeId) return;

    Alert.alert(
      "Delete Exchange",
      "Are you sure you want to delete this exchange?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExchange.mutateAsync(exchangeId);
              Alert.alert("Success", "Exchange deleted successfully");
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete exchange");
            }
          },
        },
      ]
    );
  };

  const handleAmountChange = (text: string) => {
    const numericRegex = /^\d*\.?\d*$/;
    if (text === "" || numericRegex.test(text)) {
      setAmount(text);
    }
  };

  const handleBlurAmount = () => {
    amountInputRef.current?.blur();
  };

  const typeOptions = [
    { label: "Lent (You lent money)", value: "lent" },
    { label: "Borrowed (You borrowed money)", value: "borrowed" },
  ];

  const primaryColor = type === "lent" ? "#3B82F6" : "#F59E0B";

  if (isEditMode && isLoadingExchange) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isEditMode && !exchange) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <Text className="text-gray-500 dark:text-gray-400">
          Exchange not found
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: isEditMode ? "Edit Exchange" : "New Exchange",
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
          <View className="px-4 pt-6 mb-6">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  handleBlurAmount();
                  setType("lent");
                }}
                className={`flex-1 rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                  type === "lent"
                    ? "bg-blue-500 dark:bg-blue-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
                style={
                  type === "lent"
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
                  name="trending-up"
                  size={24}
                  color={type === "lent" ? "#FFFFFF" : "#3B82F6"}
                />
                <Text
                  className={`font-bold text-base ${
                    type === "lent"
                      ? "text-white"
                      : "text-blue-500 dark:text-blue-400"
                  }`}
                >
                  Lent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  handleBlurAmount();
                  setType("borrowed");
                }}
                className={`flex-1 rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                  type === "borrowed"
                    ? "bg-amber-500 dark:bg-amber-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
                style={
                  type === "borrowed"
                    ? {
                        shadowColor: "#F59E0B",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      }
                    : {}
                }
              >
                <Ionicons
                  name="trending-down"
                  size={24}
                  color={type === "borrowed" ? "#FFFFFF" : "#F59E0B"}
                />
                <Text
                  className={`font-bold text-base ${
                    type === "borrowed"
                      ? "text-white"
                      : "text-amber-500 dark:text-amber-400"
                  }`}
                >
                  Borrowed
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
                  {currencySymbol}
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
                {/* Person Name */}
                <TouchableOpacity
                  onPress={() => {
                    handleBlurAmount();
                    personNameInputRef.current?.focus();
                  }}
                  className="flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800"
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mr-3">
                      <Ionicons name="person" size={24} color="#6366F1" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Person Name
                      </Text>
                      <Text
                        className={`text-base font-semibold ${
                          personName.trim()
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {personName.trim() || "Enter person's name"}
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
                  className="flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800"
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

                {/* Due Date */}
                <TouchableOpacity
                  onPress={() => {
                    handleBlurAmount();
                    if (dueDate) {
                      setDueDate(null);
                    } else {
                      dueDatePickerRef.current?.open();
                    }
                  }}
                  className="flex-row items-center justify-between py-4"
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 items-center justify-center mr-3">
                      <Ionicons name="time" size={24} color="#EAB308" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Due Date {dueDate ? "(Optional)" : ""}
                      </Text>
                      <Text
                        className={`text-base font-semibold ${
                          dueDate
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {dueDate ? format(dueDate, "MMM dd, yyyy") : "No due date"}
                      </Text>
                    </View>
                  </View>
                  {dueDate ? (
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  )}
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

              {/* Person Name Input (Hidden but accessible) */}
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="person" size={16} color="#6B7280" />
                  <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2 uppercase tracking-wide">
                    Person Name (Required)
                  </Text>
                </View>
                <TextInput
                  ref={personNameInputRef}
                  value={personName}
                  onChangeText={setPersonName}
                  placeholder="Enter person's name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
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
              disabled={deleteExchange.isPending}
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
              {deleteExchange.isPending ? (
                <Text className="text-white font-bold text-lg">Deleting...</Text>
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                  <Text className="text-white font-bold text-base ml-2">Delete</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              key={`save-${type}`}
              onPress={handleSave}
              disabled={updateExchange.isPending}
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
              {updateExchange.isPending ? (
                <Text className="text-white font-bold text-lg">Saving...</Text>
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text className="text-white font-bold text-lg ml-2">Save</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            key={`save-${type}`}
            onPress={handleSave}
            disabled={createExchange.isPending}
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
            {createExchange.isPending ? (
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-lg mr-2">
                  Creating...
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text className="text-white font-bold text-lg ml-2">
                  Create Exchange
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Hidden Components for Date Pickers */}
      <View style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>
        <DatePicker
          ref={datePickerRef}
          label="Date"
          value={date}
          onChange={setDate}
          maxDate={new Date()}
        />
        <DatePicker
          ref={dueDatePickerRef}
          label="Due Date"
          value={dueDate}
          onChange={(newDate) => setDueDate(newDate)}
          minDate={date}
        />
      </View>
    </View>
  );
}
