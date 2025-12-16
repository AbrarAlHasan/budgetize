import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ExchangeStatus, ExchangeType } from "@/db/schema/types";
import { useInstallmentProgress } from "@/hooks/queries/use-exchange-installments";

interface ExchangeItemProps {
  id: number;
  person_name: string;
  amount: number;
  type: ExchangeType;
  status: ExchangeStatus;
  date: string;
  due_date?: string | null;
  note?: string | null;
  currencySymbol?: string; // Currency symbol
  showInstallmentProgress?: boolean; // Show installment progress badge
}

export function ExchangeItem({
  id,
  person_name,
  amount,
  type,
  status,
  date,
  due_date,
  note,
  currencySymbol = "$",
  showInstallmentProgress = true,
}: ExchangeItemProps) {
  const isLent = type === "lent";
  const isPending = status === "pending";
  const isPaid = status === "paid" || status === "received";
  
  // Get installment progress if pending and enabled
  const { data: progress } = useInstallmentProgress(
    isPending && showInstallmentProgress ? id : 0,
    isPending && showInstallmentProgress ? amount : 0
  );

  // Color scheme based on type and status
  const iconColor = isLent ? "#3B82F6" : "#F59E0B"; // Blue for lent, amber for borrowed
  const iconBgColor = isLent ? "#DBEAFE" : "#FEF3C7";
  const statusColor = isPending
    ? "#F59E0B"
    : isPaid
    ? "#10B981"
    : "#6B7280";

  const statusText =
    status === "pending"
      ? isLent
        ? "Pending"
        : "Pending"
      : status === "paid"
      ? "Paid"
      : "Received";

  const iconName = isLent ? "arrow-up-circle" : "arrow-down-circle";
  
  // Use more descriptive icons
  const exchangeIcon = isLent ? "trending-up" : "trending-down";

  const handleAddInstallment = () => {
    router.push({
      pathname: `/exchanges/${id}`,
      params: { addInstallment: 'true' }
    });
  };

  return (
    <View className="mb-3">
      <View
        className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push(`/exchanges/${id}`)}
          activeOpacity={0.6}
          className="p-4"
        >
          <View className="flex-row items-start">
            {/* Icon */}
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-3 flex-shrink-0"
              style={{ backgroundColor: iconBgColor }}
            >
              <Ionicons name={exchangeIcon as any} size={24} color={iconColor} />
            </View>

            {/* Content */}
            <View className="flex-1 min-w-0">
              <View className="flex-row justify-between items-start mb-1">
                <View className="flex-1 min-w-0 mr-2">
                  <Text
                    className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-0.5"
                    numberOfLines={1}
                  >
                    {person_name}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(date), "EEE, dd MMM yyyy")}
                    {due_date && (
                      <Text className="text-amber-600 dark:text-amber-400">
                        {" "}
                        • Due: {format(new Date(due_date), "dd MMM")}
                      </Text>
                    )}
                  </Text>
                </View>
                <View className="items-end flex-shrink-0">
                  <Text
                    className={cn(
                      "text-base font-bold",
                      isLent ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {isLent ? "+" : "-"}
                    {currencySymbol}
                    {Math.abs(amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <View className="mt-1">
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          status === "pending"
                            ? "#FEF3C7"
                            : status === "paid" || status === "received"
                            ? "#D1FAE5"
                            : "#F3F4F6",
                      }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{
                          color: statusColor,
                        }}
                      >
                        {statusText}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Installment Progress Bar */}
              {isPending && progress && progress.totalPaid > 0 && (
                <View className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs text-gray-600 dark:text-gray-400">
                      Paid: {currencySymbol}
                      {progress.totalPaid.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <Text className="text-xs text-gray-600 dark:text-gray-400">
                      Remaining: {currencySymbol}
                      {progress.remaining.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                  <View className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                    <View
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </View>
                  <Text className="text-xs text-gray-500 dark:text-gray-500 text-right">
                    {progress.percentage.toFixed(0)}% complete
                  </Text>
                </View>
              )}

              {/* Note */}
              {note && (
                <Text
                  className="text-xs text-gray-500 dark:text-gray-400 mt-2"
                  numberOfLines={1}
                >
                  {note}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Minimalist Add Installment Button */}
        {isPending && (
          <View className="border-t border-gray-100 dark:border-gray-800">
            <TouchableOpacity
              onPress={handleAddInstallment}
              className="flex-row items-center justify-center py-3 px-4"
              activeOpacity={0.6}
            >
              <Ionicons 
                name="add-circle-outline" 
                size={18} 
                color={isLent ? "#3B82F6" : "#F59E0B"} 
              />
              <Text 
                className="text-sm font-medium ml-2"
                style={{ color: isLent ? "#3B82F6" : "#F59E0B" }}
              >
                Add Installment
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

