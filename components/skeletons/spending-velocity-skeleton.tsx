import React from "react";
import { View, StyleSheet } from "react-native";
import { SkeletonBase } from "./skeleton-base";
import { Card } from "../ui/card";
import { useColorScheme } from "nativewind";

/**
 * Eye-catching skeleton loader for Spending Velocity section
 */
export function SpendingVelocitySkeleton() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Card className="mb-6" style={styles.card}>
      {/* Header with icon and badge */}
      <View className="flex-row justify-between items-center mb-5">
        <View className="flex-row items-center gap-3">
          {/* Icon skeleton with pulse effect */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
            ]}
          >
            <SkeletonBase width={24} height={24} borderRadius={12} />
          </View>
          <SkeletonBase width={150} height={22} borderRadius={6} />
        </View>
        {/* Status badge skeleton */}
        <View
          style={[
            styles.badgeContainer,
            { backgroundColor: isDark ? "#374151" : "#F3F4F6" },
          ]}
        >
          <SkeletonBase width={8} height={8} borderRadius={4} />
          <SkeletonBase width={70} height={16} borderRadius={8} />
        </View>
      </View>

      {/* Metrics Row - Enhanced with better spacing */}
      <View className="flex-row gap-5 mb-5">
        <View className="flex-1">
          <SkeletonBase
            width={90}
            height={12}
            borderRadius={6}
            className="mb-2"
          />
          <SkeletonBase width={120} height={24} borderRadius={8} />
        </View>
        <View className="flex-1">
          <SkeletonBase
            width={110}
            height={12}
            borderRadius={6}
            className="mb-2"
          />
          <SkeletonBase width={120} height={24} borderRadius={8} />
        </View>
      </View>

      {/* Progress Bar - More prominent */}
      <View className="mb-3">
        <View
          style={[
            styles.progressBarContainer,
            { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
          ]}
        >
          {/* Animated progress fill skeleton */}
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: isDark ? "#4B5563" : "#D1D5DB",
                width: "45%", // Simulating ~45% progress
              },
            ]}
          >
            <SkeletonBase width="100%" height="100%" borderRadius={6} />
          </View>
        </View>
        {/* Progress labels */}
        <View className="flex-row justify-between mt-2">
          <SkeletonBase width={110} height={12} borderRadius={6} />
          <SkeletonBase width={120} height={12} borderRadius={6} />
        </View>
      </View>

      {/* Insight Text - Enhanced styling */}
      <View
        style={[
          styles.insightContainer,
          { backgroundColor: isDark ? "#1F2937" : "#F9FAFB" },
        ]}
      >
        <View style={styles.iconWrapper}>
          <SkeletonBase width={18} height={18} borderRadius={9} />
        </View>
        <View className="flex-1">
          <SkeletonBase
            width="95%"
            height={14}
            borderRadius={6}
            className="mb-2"
          />
          <SkeletonBase width="75%" height={14} borderRadius={6} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  insightContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  iconWrapper: {
    marginTop: 2,
  },
});

