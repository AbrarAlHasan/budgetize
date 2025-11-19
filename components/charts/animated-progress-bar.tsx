import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  percentage: number;
  color: string;
  height?: number;
  animationKey?: number | string;
  index?: number;
  delay?: number;
}

export function AnimatedProgressBar({
  percentage,
  color,
  height = 10,
  animationKey,
  index = 0,
  delay,
}: AnimatedProgressBarProps) {
  // Animation seed ensures animations restart when key changes
  const [animationSeed, setAnimationSeed] = useState(0);
  
  useEffect(() => {
    setAnimationSeed((prev) => prev + 1);
  }, [animationKey, percentage]);

  // Animation value for width
  const widthAnimated = useSharedValue(0);

  // Animated style - grows from left to right
  const progressAnimatedStyle = useAnimatedStyle(() => {
    const clampedPercentage = Math.min(percentage, 100);
    return {
      width: `${clampedPercentage * widthAnimated.value}%`,
    };
  });

  // Trigger animation
  useEffect(() => {
    // Reset value
    widthAnimated.value = 0;
    
    // Calculate delay - use provided delay or calculate from index
    const animationDelay = delay !== undefined ? delay : index * 90;
    
    // Animate width from left to right with spring
    widthAnimated.value = withDelay(
      animationDelay,
      withSpring(1, {
        damping: 15,
        stiffness: 110,
        mass: 0.8,
      })
    );
  }, [animationSeed, index, widthAnimated, delay]);

  return (
    <View 
      className="bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"
      style={{ height }}
    >
      <Animated.View
        className="h-full rounded-full"
        style={[
          {
            backgroundColor: color,
          },
          progressAnimatedStyle,
        ]}
      />
    </View>
  );
}

