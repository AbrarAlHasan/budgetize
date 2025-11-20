import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";
import { Card } from "../ui/card";

interface ReportsSummaryCardsSkeletonProps {
  showIncome?: boolean;
}

/**
 * Skeleton loader for Reports Summary Cards section (with trend indicators)
 */
export function ReportsSummaryCardsSkeleton({
  showIncome = true,
}: ReportsSummaryCardsSkeletonProps) {
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
            {/* Trend indicator skeleton */}
            <View className="mt-2 flex-row items-center gap-1">
              <SkeletonBase width={12} height={12} borderRadius={6} />
              <SkeletonBase width={40} height={12} borderRadius={4} />
            </View>
            <SkeletonBase width={80} height={10} borderRadius={4} className="mt-1" />
          </View>
        )}

        {/* Expense Card Skeleton */}
        <View className="flex-1 rounded-2xl p-4 bg-gray-100 dark:bg-gray-900">
          <View className="flex-row items-center justify-between mb-2">
            <SkeletonBase width={50} height={12} borderRadius={4} />
            <SkeletonBase width={16} height={16} borderRadius={8} />
          </View>
          <SkeletonBase width="80%" height={28} borderRadius={6} />
          {/* Trend indicator skeleton */}
          <View className="mt-2 flex-row items-center gap-1">
            <SkeletonBase width={12} height={12} borderRadius={6} />
            <SkeletonBase width={40} height={12} borderRadius={4} />
          </View>
          <SkeletonBase width={80} height={10} borderRadius={4} className="mt-1" />
        </View>
      </View>

      {/* Net Amount Card Skeleton */}
      {showIncome && (
        <Card className="bg-gray-100 dark:bg-gray-900">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <SkeletonBase width={70} height={14} borderRadius={4} className="mb-1" />
              <SkeletonBase width="60%" height={28} borderRadius={6} />
              {/* Trend indicator skeleton */}
              <View className="mt-2 flex-row items-center gap-1">
                <SkeletonBase width={12} height={12} borderRadius={6} />
                <SkeletonBase width={40} height={12} borderRadius={4} />
              </View>
            </View>
            <SkeletonBase width={32} height={32} borderRadius={16} />
          </View>
          {/* Stats row skeleton */}
          <View className="flex-row gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <View className="flex-1">
              <SkeletonBase width={70} height={10} borderRadius={4} className="mb-1" />
              <SkeletonBase width={40} height={18} borderRadius={4} />
              <View className="mt-1 flex-row items-center gap-1">
                <SkeletonBase width={12} height={12} borderRadius={6} />
                <SkeletonBase width={30} height={10} borderRadius={4} />
              </View>
            </View>
            <View className="flex-1">
              <SkeletonBase width={70} height={10} borderRadius={4} className="mb-1" />
              <SkeletonBase width={40} height={18} borderRadius={4} />
            </View>
          </View>
        </Card>
      )}
    </View>
  );
}

