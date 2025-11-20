import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";
import { Card } from "../ui/card";

/**
 * Skeleton loader for Spending Velocity section
 */
export function SpendingVelocitySkeleton() {
  return (
    <Card className="mb-6">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center gap-2">
          <SkeletonBase width={20} height={20} borderRadius={10} />
          <SkeletonBase width={140} height={20} borderRadius={4} />
        </View>
        <View className="flex-row items-center gap-2 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          <SkeletonBase width={6} height={6} borderRadius={3} />
          <SkeletonBase width={60} height={14} borderRadius={4} />
        </View>
      </View>

      {/* Metrics Row */}
      <View className="flex-row gap-4 mb-4">
        <View className="flex-1">
          <SkeletonBase width={80} height={10} borderRadius={4} className="mb-1" />
          <SkeletonBase width={100} height={18} borderRadius={4} />
        </View>
        <View className="flex-1">
          <SkeletonBase width={100} height={10} borderRadius={4} className="mb-1" />
          <SkeletonBase width={100} height={18} borderRadius={4} />
        </View>
      </View>

      {/* Progress Bar */}
      <View className="mb-2">
        <SkeletonBase width="100%" height={8} borderRadius={4} />
      </View>
      <View className="flex-row justify-between mb-4">
        <SkeletonBase width={100} height={10} borderRadius={4} />
        <SkeletonBase width={100} height={10} borderRadius={4} />
      </View>

      {/* Insight Text */}
      <View className="flex-row items-start gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <SkeletonBase width={16} height={16} borderRadius={8} />
        <View className="flex-1">
          <SkeletonBase width="100%" height={10} borderRadius={4} className="mb-1" />
          <SkeletonBase width="80%" height={10} borderRadius={4} />
        </View>
      </View>
    </Card>
  );
}

