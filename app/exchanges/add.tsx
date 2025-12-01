import { DatePicker } from "@/components/date-picker";
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
  View,
} from "react-native";

export default function AddExchangeScreen() {
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  const exchangeId = params.id ? parseInt(params.id, 10) : null;
  const isEditMode = !!exchangeId;
  const originLabel = params.from ?? "Exchange";

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

  const datePickerRef = useRef<any>(null);
  const dueDatePickerRef = useRef<any>(null);
  const amountInputRef = useRef<TextInput>(null);

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
          headerRight: isEditMode
            ? () => (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={{
                    width: 40,
                    borderRadius: 100,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )
            : undefined,
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
                  amountInputRef.current?.blur();
                  setType("lent");
                }}
                className={`flex-1 rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                  type === "lent"
                    ? "bg-blue-500 dark:bg-blue-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <Ionicons
                  name="trending-up"
                  size={24}
                  color={type === "lent" ? "#FFFFFF" : "#3B82F6"}
                />
                <Text
                  className={`text-base font-semibold ${
                    type === "lent"
                      ? "text-white"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  Lent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  amountInputRef.current?.blur();
                  setType("borrowed");
                }}
                className={`flex-1 rounded-2xl p-4 flex-row items-center justify-center gap-2 ${
                  type === "borrowed"
                    ? "bg-amber-500 dark:bg-amber-600"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <Ionicons
                  name="trending-down"
                  size={24}
                  color={type === "borrowed" ? "#FFFFFF" : "#F59E0B"}
                />
                <Text
                  className={`text-base font-semibold ${
                    type === "borrowed"
                      ? "text-white"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  Borrowed
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="px-4 space-y-4">
            {/* Person Name */}
            <View>
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Person Name *
              </Text>
              <TextInput
                className="bg-white dark:bg-gray-800 rounded-xl p-4 text-base text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                placeholder="Enter person's name"
                placeholderTextColor="#9CA3AF"
                value={personName}
                onChangeText={setPersonName}
                autoCapitalize="words"
              />
            </View>

            {/* Amount */}
            <View>
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Amount *
              </Text>
              <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Text className="px-4 text-base text-gray-700 dark:text-gray-300 font-medium">
                  {currencySymbol}
                </Text>
                <TextInput
                  ref={amountInputRef}
                  className="flex-1 p-4 text-base text-gray-900 dark:text-gray-100"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Date */}
            <DatePicker
              ref={datePickerRef}
              label="Date *"
              value={date}
              onChange={setDate}
              maxDate={new Date()}
            />

            {/* Due Date (Optional) */}
            <View>
              <DatePicker
                ref={dueDatePickerRef}
                label="Due Date (Optional)"
                value={dueDate}
                onChange={(newDate) => setDueDate(newDate)}
                minDate={date}
              />
              {dueDate && (
                <TouchableOpacity
                  onPress={() => setDueDate(null)}
                  className="mt-2"
                >
                  <Text className="text-sm text-blue-600 dark:text-blue-400">
                    Clear due date
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Note */}
            <View>
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Note (Optional)
              </Text>
              <TextInput
                className="bg-white dark:bg-gray-800 rounded-xl p-4 text-base text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 min-h-[100px]"
                placeholder="Add a note..."
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View className="absolute bottom-0 left-0 right-0 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800 p-4">
          <TouchableOpacity
            onPress={handleSave}
            className="rounded-xl p-4 items-center"
            style={{
              backgroundColor: primaryColor,
            }}
            disabled={createExchange.isPending || updateExchange.isPending}
          >
            {createExchange.isPending || updateExchange.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {isEditMode ? "Update Exchange" : "Create Exchange"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
