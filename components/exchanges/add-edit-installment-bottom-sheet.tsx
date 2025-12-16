import { DatePicker, DatePickerRef } from "@/components/date-picker";
import { useCreateInstallment, useUpdateInstallment, useInstallmentProgress } from "@/hooks/queries/use-exchange-installments";
import { useExchange } from "@/hooks/queries/use-exchanges";
import { useSettingsStore } from "@/store/settings-store";
import { getCurrencySymbol } from "@/utils/currencies";
import { DecryptedExchangeInstallment } from "@/db/schema/types";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState, useEffect } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import BottomSheet from "../bottom-sheet";
import { Button } from "../ui/button";

export interface AddEditInstallmentBottomSheetRef {
  present: (exchangeId: number, installment?: DecryptedExchangeInstallment) => void;
  dismiss: () => void;
}

interface AddEditInstallmentBottomSheetProps {
  onInstallmentSaved?: () => void;
}

export const AddEditInstallmentBottomSheet = forwardRef<
  AddEditInstallmentBottomSheetRef,
  AddEditInstallmentBottomSheetProps
>(({ onInstallmentSaved }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const datePickerRef = useRef<DatePickerRef>(null);
  const [exchangeId, setExchangeId] = useState<number | null>(null);
  const [installment, setInstallment] = useState<DecryptedExchangeInstallment | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");

  const createInstallment = useCreateInstallment();
  const updateInstallment = useUpdateInstallment();
  const { settings } = useSettingsStore();
  const currencySymbol = getCurrencySymbol(settings?.currency || "INR");

  // Get exchange details and progress for validation
  const { data: exchange } = useExchange(exchangeId || 0);
  const { data: progress } = useInstallmentProgress(
    exchangeId || 0,
    exchange?.amount || 0
  );

  const isEditMode = !!installment;

  useImperativeHandle(ref, () => ({
    present: (exId: number, inst?: DecryptedExchangeInstallment) => {
      setExchangeId(exId);
      if (inst) {
        setInstallment(inst);
        setAmount(inst.amount.toString());
        setPaymentDate(parseISO(inst.payment_date));
        setNote(inst.note || "");
      } else {
        setInstallment(null);
        setAmount("");
        setPaymentDate(new Date());
        setNote("");
      }
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    setExchangeId(null);
    setInstallment(null);
    setAmount("");
    setPaymentDate(new Date());
    setNote("");
  }, []);

  const handleAmountChange = (text: string) => {
    const numericRegex = /^\d*\.?\d*$/;
    if (text === "" || numericRegex.test(text)) {
      setAmount(text);
    }
  };

  const handleSave = async () => {
    if (!exchangeId || !exchange) return;

    if (!amount.trim()) {
      Alert.alert("Error", "Amount is required");
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // Validation: Check if installment exceeds exchange amount
    if (isEditMode && installment) {
      // For edit mode: calculate what the new total would be
      const currentTotalPaid = progress?.totalPaid || 0;
      const oldInstallmentAmount = installment.amount;
      const newTotalPaid = currentTotalPaid - oldInstallmentAmount + amountValue;

      if (newTotalPaid > exchange.amount) {
        const remaining = exchange.amount - (currentTotalPaid - oldInstallmentAmount);
        Alert.alert(
          "Amount Exceeds Limit",
          `The total installments cannot exceed the exchange amount of ${currencySymbol}${exchange.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}.\n\nMaximum amount you can enter: ${currencySymbol}${remaining.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        );
        return;
      }
    } else {
      // For create mode: check if adding this installment would exceed the limit
      const currentTotalPaid = progress?.totalPaid || 0;
      const newTotalPaid = currentTotalPaid + amountValue;

      if (newTotalPaid > exchange.amount) {
        const remaining = exchange.amount - currentTotalPaid;
        Alert.alert(
          "Amount Exceeds Limit",
          `The total installments cannot exceed the exchange amount of ${currencySymbol}${exchange.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}.\n\nRemaining amount: ${currencySymbol}${remaining.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        );
        return;
      }
    }

    try {
      const dateString = format(paymentDate, "yyyy-MM-dd");

      if (isEditMode && installment) {
        await updateInstallment.mutateAsync({
          id: installment.id,
          amount: amountValue,
          payment_date: dateString,
          note: note.trim() || null,
        });
        Alert.alert("Success", "Installment updated successfully");
      } else {
        await createInstallment.mutateAsync({
          exchange_id: exchangeId,
          amount: amountValue,
          payment_date: dateString,
          note: note.trim() || null,
        });
        Alert.alert("Success", "Installment added successfully");
      }

      if (onInstallmentSaved) {
        onInstallmentSaved();
      }
      handleClose();
    } catch (error) {
      // Show user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : (isEditMode ? "Failed to update installment" : "Failed to create installment");
      
      // Check if it's a validation error about exceeding limit
      if (errorMessage.includes("exceeds the exchange limit") || errorMessage.includes("exceeds the limit")) {
        Alert.alert("Amount Exceeds Limit", errorMessage);
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const handleBottomSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        handleClose();
      }
    },
    [handleClose]
  );

  return (
    <>
      <BottomSheet
        bottomSheetModalRef={bottomSheetRef}
        snapPoints={["60%", "80%"]}
        index={0}
        onBottomSheetChange={handleBottomSheetChange}
        onClose={handleClose}
      >
        <View className="px-4 py-6">
          <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {isEditMode ? "Edit Installment" : "Add Installment"}
          </Text>

          {/* Amount */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Amount
              </Text>
              {exchange && progress && (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Remaining: {currencySymbol}
                  {isEditMode && installment
                    ? (exchange.amount - (progress.totalPaid - installment.amount)).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : (exchange.amount - progress.totalPaid).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </Text>
              )}
            </View>
            <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
              <Text className="text-gray-400 dark:text-gray-500 text-lg mr-2">
                {currencySymbol}
              </Text>
              <TextInput
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="flex-1 text-gray-900 dark:text-gray-100 text-lg"
              />
            </View>
            {exchange && (
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Exchange total: {currencySymbol}
                {exchange.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            )}
          </View>

          {/* Payment Date */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Payment Date
            </Text>
            <TouchableOpacity
              onPress={() => datePickerRef.current?.open()}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between"
            >
              <Text className="text-gray-900 dark:text-gray-100">
                {format(paymentDate, "MMM dd, yyyy")}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Note (Optional)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />
          </View>

          {/* Save Button */}
          <Button
            onPress={handleSave}
            disabled={createInstallment.isPending || updateInstallment.isPending}
            className="bg-blue-600 dark:bg-blue-500"
          >
            {createInstallment.isPending || updateInstallment.isPending ? (
              <Text className="text-white font-semibold">Saving...</Text>
            ) : (
              <Text className="text-white font-semibold">
                {isEditMode ? "Update Installment" : "Add Installment"}
              </Text>
            )}
          </Button>
        </View>
      </BottomSheet>

      {/* Hidden Date Picker */}
      <View style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>
        <DatePicker
          ref={datePickerRef}
          label="Payment Date"
          value={paymentDate}
          onChange={setPaymentDate}
          maxDate={new Date()}
        />
      </View>
    </>
  );
});

