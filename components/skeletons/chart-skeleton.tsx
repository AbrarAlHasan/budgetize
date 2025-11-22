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
  // Reserve space for labels at bottom
  const labelHeight = 30;
  const chartAreaHeight = height - labelHeight;
  
  return (
    <Card className="mb-6">
      <SkeletonBase width={150} height={20} borderRadius={4} className="mb-4" />
      <View style={{ height: chartAreaHeight }}>
        {/* Chart bars skeleton */}
        <View 
          className="flex-row items-end justify-between h-full" 
          style={{ 
            paddingBottom: 4,
            gap: 4,
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((index) => {
            // Calculate bar height as percentage of chart area, capped at 85%
            const barHeightPercent = Math.min(60 + (index * 10), 85);
            const barHeight = (barHeightPercent / 100) * chartAreaHeight;
            
            return (
              <View 
                key={index} 
                className="flex-1 items-center justify-end" 
                style={{ 
                  height: '100%',
                  maxHeight: '100%',
                }}
              >
              {showValues && (
                  <View style={{ marginBottom: 4, height: 12, width: '100%', alignItems: 'center' }}>
                <SkeletonBase width={40} height={12} borderRadius={4} />
                  </View>
              )}
                <View 
                  className="w-full items-center justify-end"
                  style={{ 
                    flex: 1,
                    justifyContent: 'flex-end',
                    minHeight: 0,
                    maxHeight: '100%',
                  }}
                >
              <SkeletonBase
                width="80%"
                    height={Math.max(barHeight, 4)}
                borderRadius={4}
              />
                </View>
              </View>
            );
          })}
        </View>
      </View>
      {/* Labels at bottom */}
      {showValues && (
        <View className="mt-3 flex-row justify-between">
          {[1, 2, 3, 4, 5, 6, 7].map((index) => (
            <View key={index} className="flex-1 items-center">
              <SkeletonBase width={30} height={10} borderRadius={4} />
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

