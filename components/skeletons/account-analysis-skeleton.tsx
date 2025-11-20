import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";
import { Card } from "../ui/card";

interface AccountAnalysisSkeletonProps {
  showIncome?: boolean;
}

/**
 * Skeleton loader for Account Analysis section
 */
export function AccountAnalysisSkeleton({
  showIncome = true,
}: AccountAnalysisSkeletonProps) {
  return (
    <Card>
      <SkeletonBase width={150} height={20} borderRadius={4} className="mb-4" />
      <View className="gap-4">
        {[1, 2, 3].map((index) => (
          <View
            key={index}
            className="pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1">
                <SkeletonBase width={120} height={18} borderRadius={4} className="mb-1" />
                <SkeletonBase width={80} height={12} borderRadius={4} />
              </View>
              <View className="items-end">
                <SkeletonBase width={80} height={20} borderRadius={4} />
                <SkeletonBase width={30} height={10} borderRadius={4} className="mt-0.5" />
              </View>
            </View>
            <View className="flex-row gap-4 mt-3">
              <View className="flex-1">
                <SkeletonBase width={60} height={10} borderRadius={4} className="mb-1" />
                <SkeletonBase width={70} height={14} borderRadius={4} />
              </View>
              {showIncome && (
                <View className="flex-1">
                  <SkeletonBase width={60} height={10} borderRadius={4} className="mb-1" />
                  <SkeletonBase width={70} height={14} borderRadius={4} />
                </View>
              )}
              <View className="flex-1">
                <SkeletonBase width={70} height={10} borderRadius={4} className="mb-1" />
                <SkeletonBase width={40} height={14} borderRadius={4} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

