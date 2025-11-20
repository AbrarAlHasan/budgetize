import React from "react";
import { View } from "react-native";

interface SkeletonBaseProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

/**
 * Base skeleton component with shimmer effect
 */
export function SkeletonBase({
  width = "100%",
  height = 20,
  borderRadius = 8,
  className = "",
}: SkeletonBaseProps) {
  return (
    <View
      className={`bg-gray-200 dark:bg-gray-800 ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

