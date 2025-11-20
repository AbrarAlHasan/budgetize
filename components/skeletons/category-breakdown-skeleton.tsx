import React from "react";
import { View } from "react-native";
import { SkeletonBase } from "./skeleton-base";
import { Card } from "../ui/card";

/**
 * Skeleton loader for Category Breakdown section
 */
export function CategoryBreakdownSkeleton() {
  return (
    <Card className="mb-6">
      <SkeletonBase width={150} height={20} borderRadius={4} className="mb-4" />
      <View className="gap-3">
        {[1, 2, 3, 4].map((index) => (
          <View key={index}>
            <View className="flex-row justify-between items-center mb-2">
              <SkeletonBase width={120} height={16} borderRadius={4} />
              <View className="flex-row items-center gap-2">
                <SkeletonBase width={60} height={16} borderRadius={4} />
                <SkeletonBase width={30} height={12} borderRadius={4} />
              </View>
            </View>
            <SkeletonBase width="100%" height={10} borderRadius={5} />
          </View>
        ))}
      </View>
    </Card>
  );
}

