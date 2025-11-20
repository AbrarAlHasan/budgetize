import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";

interface SummaryCardsSkeletonProps {
  showIncome?: boolean;
}

/**
 * Skeleton loader for Summary Cards section (Income, Expense, Net Amount)
 */
export function SummaryCardsSkeleton({
  showIncome = true,
}: SummaryCardsSkeletonProps) {
  return (
    <View className="mb-6">
      {/* Income and Expense Cards Row */}
      <View className={`flex-row gap-3 ${showIncome ? "mb-3" : ""}`}>
        {/* Income Card Skeleton */}
        {showIncome && (
          <View className="flex-1 rounded-2xl p-4 bg-gray-100 dark:bg-gray-900">
            <View className="flex-row items-center justify-between mb-2">
              <SkeletonBase width={50} height={12} borderRadius={4} />
              <SkeletonBase width={16} height={16} borderRadius={8} />
            </View>
            <SkeletonBase width="80%" height={28} borderRadius={6} />
            <SkeletonBase width={60} height={10} borderRadius={4} className="mt-1" />
          </View>
        )}

        {/* Expense Card Skeleton */}
        <View className="flex-1 rounded-2xl p-4 bg-gray-100 dark:bg-gray-900">
          <View className="flex-row items-center justify-between mb-2">
            <SkeletonBase width={50} height={12} borderRadius={4} />
            <SkeletonBase width={16} height={16} borderRadius={8} />
          </View>
          <SkeletonBase width="80%" height={28} borderRadius={6} />
          <SkeletonBase width={60} height={10} borderRadius={4} className="mt-1" />
        </View>
      </View>

      {/* Net Amount Card Skeleton */}
      {showIncome && (
        <View className="rounded-2xl p-4 bg-gray-100 dark:bg-gray-900">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <SkeletonBase width={70} height={14} borderRadius={4} className="mb-1" />
              <SkeletonBase width="60%" height={28} borderRadius={6} />
            </View>
            <SkeletonBase width={32} height={32} borderRadius={16} />
          </View>
          <SkeletonBase width={100} height={10} borderRadius={4} className="mt-2" />
        </View>
      )}
    </View>
  );
}

