import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";
import { Card } from "../ui/card";

interface EnhancedBreakdownSkeletonProps {
  title?: string;
}

/**
 * Skeleton loader for enhanced breakdown sections (Category, Tags)
 * with additional stats like transaction count and average
 */
export function EnhancedBreakdownSkeleton({
  title = "Breakdown",
}: EnhancedBreakdownSkeletonProps) {
  return (
    <Card className="mb-6">
      <SkeletonBase width={150} height={20} borderRadius={4} className="mb-4" />
      <View className="gap-3">
        {[1, 2, 3, 4].map((index) => (
          <View key={index}>
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-2 flex-1">
                <SkeletonBase width={120} height={16} borderRadius={4} />
                {/* Optional deleted badge skeleton */}
                {index === 2 && (
                  <SkeletonBase width={50} height={16} borderRadius={4} />
                )}
              </View>
              <View className="flex-row items-center gap-2">
                <SkeletonBase width={60} height={16} borderRadius={4} />
                <SkeletonBase width={35} height={12} borderRadius={4} />
              </View>
            </View>
            <SkeletonBase width="100%" height={10} borderRadius={5} />
            {/* Additional stats row */}
            <View className="flex-row justify-between items-center mt-1">
              <SkeletonBase width={100} height={10} borderRadius={4} />
              <SkeletonBase width={80} height={10} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

