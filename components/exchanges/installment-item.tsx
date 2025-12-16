import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { Ionicons } from "@expo/vector-icons";
import { DecryptedExchangeInstallment } from "@/db/schema/types";

interface InstallmentItemProps {
  installment: DecryptedExchangeInstallment;
  currencySymbol?: string;
  onPress?: () => void;
  onDelete?: () => void;
}

export function InstallmentItem({
  installment,
  currencySymbol = "$",
  onPress,
  onDelete,
}: InstallmentItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      className="mb-2"
      disabled={!onPress}
    >
      <View
        className="bg-white dark:bg-gray-900 rounded-xl p-3 flex-row items-center"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        {/* Icon */}
        <View className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 items-center justify-center mr-3">
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {currencySymbol}
              {installment.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {format(new Date(installment.payment_date), "MMM dd, yyyy")}
            </Text>
          </View>
          {installment.note && (
            <Text
              className="text-xs text-gray-500 dark:text-gray-400"
              numberOfLines={1}
            >
              {installment.note}
            </Text>
          )}
        </View>

        {/* Delete Button */}
        {onDelete && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="ml-2 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

