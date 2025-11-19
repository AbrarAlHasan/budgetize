import { useEffect, useState } from 'react';
import { TextProps } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedNumberProps extends Omit<TextProps, 'children'> {
  value: number;
  duration?: number;
  animationKey?: number | string;
  formatter?: (value: number) => string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  duration = 1500,
  animationKey,
  formatter,
  prefix = '',
  suffix = '',
  style,
  ...textProps
}: AnimatedNumberProps) {
  const progress = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Reset and animate when value or key changes
    progress.value = 0;
    setDisplayValue(0);
    
    // Animate with custom bezier easing - extremely fast start, very slow end
    // Bezier curve: (0.1, 0.1, 0.1, 1) creates a very fast initial acceleration
    // then dramatic slowdown as it approaches the target
    progress.value = withTiming(1, {
      duration,
      easing: Easing.bezier(0.1, 0.1, 0.1, 1), // Extremely fast start, very slow end
    });
  }, [value, animationKey, duration]);

  // Update display value as animation progresses
  useAnimatedReaction(
    () => progress.value,
    (currentProgress) => {
      const currentValue = value * currentProgress;
      runOnJS(setDisplayValue)(currentValue);
    }
  );

  // Format the number
  const formatValue = (val: number): string => {
    if (formatter) {
      return formatter(val);
    }
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Animated.Text style={style} {...textProps}>
      {prefix}{formatValue(displayValue)}{suffix}
    </Animated.Text>
  );
}

