import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { DimensionValue, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface SkeletonBaseProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  className?: string;
}

/**
 * Base skeleton component with animated shimmer effect
 */
export function SkeletonBase({
  width = "100%",
  height = 20,
  borderRadius = 8,
  className = "",
}: SkeletonBaseProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Shimmer animation value
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );
  }, []);

  // Shimmer overlay animation
  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerProgress.value,
      [0, 1],
      [-300, 300]
    );
    const opacity = interpolate(
      shimmerProgress.value,
      [0, 0.5, 1],
      [0.3, 0.7, 0.3]
    );
    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  return (
    <View
      className={`overflow-hidden ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: isDark ? "#1F2937" : "#E5E7EB",
      }}
    >
      {/* Base background */}
      <View
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: isDark ? "#1F2937" : "#E5E7EB",
        }}
      />
      {/* Animated shimmer overlay */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: "60%",
            height: "100%",
            backgroundColor: isDark ? "#4B5563" : "#D1D5DB",
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
}

