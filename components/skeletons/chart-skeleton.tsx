import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";
import { Card } from "../ui/card";

interface ChartSkeletonProps {
  title?: string;
  height?: number;
  showValues?: boolean;
}

/**
 * Skeleton loader for chart sections (Daily Patterns, Monthly Trends)
 */
export function ChartSkeleton({
  title = "Chart",
  height = 180,
  showValues = true,
}: ChartSkeletonProps) {
  return (
    <Card className="mb-6">
      <SkeletonBase width={150} height={20} borderRadius={4} className="mb-4" />
      <View style={{ height }}>
        {/* Chart bars skeleton */}
        <View className="flex-row items-end justify-between h-full pb-4">
          {[1, 2, 3, 4, 5, 6, 7].map((index) => (
            <View key={index} className="flex-1 items-center gap-2">
              {showValues && (
                <SkeletonBase width={40} height={12} borderRadius={4} />
              )}
              <SkeletonBase
                width="80%"
                height={`${60 + (index * 10)}%`}
                borderRadius={4}
              />
              <SkeletonBase width={30} height={10} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

