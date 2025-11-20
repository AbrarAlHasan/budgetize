import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";
import { Card } from "../ui/card";

/**
 * Skeleton loader for Period Comparison section
 */
export function PeriodComparisonSkeleton() {
  return (
    <Card className="mb-6">
      <SkeletonBase width={150} height={20} borderRadius={4} className="mb-4" />
      <View className="gap-4">
        {/* Header row */}
        <View className="flex-row justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
          <SkeletonBase width={60} height={14} borderRadius={4} />
          <View className="flex-row gap-4" style={{ width: 240 }}>
            <SkeletonBase width={60} height={14} borderRadius={4} />
            <SkeletonBase width={60} height={14} borderRadius={4} />
            <SkeletonBase width={60} height={14} borderRadius={4} />
          </View>
        </View>
        {/* Data rows */}
        {[1, 2, 3].map((index) => (
          <View key={index} className="flex-row justify-between items-center">
            <SkeletonBase width={80} height={14} borderRadius={4} />
            <View className="flex-row gap-4" style={{ width: 240 }}>
              <SkeletonBase width={60} height={14} borderRadius={4} />
              <SkeletonBase width={60} height={14} borderRadius={4} />
              <View className="flex-row items-center gap-1">
                <SkeletonBase width={12} height={12} borderRadius={6} />
                <SkeletonBase width={40} height={12} borderRadius={4} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

