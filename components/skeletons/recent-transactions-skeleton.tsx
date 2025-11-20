import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";

/**
 * Skeleton loader for Recent Transactions section
 */
export function RecentTransactionsSkeleton() {
  return (
    <View>
      <SkeletonBase width={120} height={20} borderRadius={4} className="mb-4" />
      <View className="gap-3">
        {[1, 2, 3, 4, 5].map((index) => (
          <View
            key={index}
            className="bg-white dark:bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-1">
              <View className="flex-row items-center gap-3 mb-2">
                <SkeletonBase width={48} height={48} borderRadius={24} />
                <View className="flex-1">
                  <SkeletonBase width="60%" height={16} borderRadius={4} className="mb-2" />
                  <SkeletonBase width="40%" height={12} borderRadius={4} />
                </View>
              </View>
            </View>
            <View className="items-end">
              <SkeletonBase width={80} height={18} borderRadius={4} className="mb-1" />
              <SkeletonBase width={60} height={12} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

