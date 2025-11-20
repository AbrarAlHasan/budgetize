import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";

interface TransactionsListSkeletonProps {
  count?: number;
}

/**
 * Skeleton loader for transactions list (used in expenses screen)
 */
export function TransactionsListSkeleton({ count = 5 }: TransactionsListSkeletonProps) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          className="bg-white dark:bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between"
        >
          <View className="flex-1">
            <View className="flex-row items-center gap-3 mb-2">
              <SkeletonBase width={48} height={48} borderRadius={24} />
              <View className="flex-1">
                <SkeletonBase width="70%" height={16} borderRadius={4} className="mb-2" />
                <SkeletonBase width="50%" height={12} borderRadius={4} />
              </View>
            </View>
            {/* Tags/Category skeleton */}
            <View className="flex-row items-center gap-2 ml-14">
              <SkeletonBase width={60} height={20} borderRadius={10} />
              <SkeletonBase width={80} height={20} borderRadius={10} />
            </View>
          </View>
          <View className="items-end">
            <SkeletonBase width={80} height={18} borderRadius={4} className="mb-1" />
            <SkeletonBase width={60} height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

