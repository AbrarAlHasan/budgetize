import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarData[];
  height?: number;
  showValues?: boolean;
  maxValue?: number;
  showYAxis?: boolean;
  yAxisSteps?: number;
  currencySymbol?: string;
  animationKey?: number | string;
}

export function SimpleBarChart({ 
  data, 
  height = 200, 
  showValues = true,
  maxValue,
  showYAxis = false,
  yAxisSteps = 4,
  currencySymbol = '',
  animationKey,
}: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  const steps = Array.from({ length: yAxisSteps + 1 }, (_, i) => max - (max / yAxisSteps) * i);
  const formatPrecision = (value: number) => {
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
    return formatted.replace(/\.0$/, '');
  };
  const formatCompactNumber = (value: number) => {
    if (value >= 1e7) return `${formatPrecision(value / 1e7)}Cr`;
    if (value >= 1e5) return `${formatPrecision(value / 1e5)}L`;
    if (value >= 1e3) return `${formatPrecision(value / 1e3)}k`;
    return value.toFixed(0);
  };

  // Generate grid lines (horizontal lines)
  const gridLines = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const percentage = (i / yAxisSteps) * 100;
    return percentage;
  });

  // Animation seed ensures animations restart when data/key change
  const [animationSeed, setAnimationSeed] = useState(0);
  const previousDataRef = React.useRef<string>('');
  const previousKeyRef = React.useRef<string | number | undefined>(undefined);
  
  useEffect(() => {
    // Create a stable key from data values (not reference)
    const dataKey = JSON.stringify(data.map(d => ({ label: d.label, value: d.value })));
    const keyChanged = animationKey !== previousKeyRef.current;
    const dataChanged = dataKey !== previousDataRef.current;
    
    // Only update animation seed if data values or animation key actually changed
    if (keyChanged || (dataChanged && previousDataRef.current !== '')) {
      setAnimationSeed((prev) => prev + 1);
    }
    
    previousDataRef.current = dataKey;
    previousKeyRef.current = animationKey;
  }, [data, animationKey]);

  const chartContent = (
    <View className="flex-row items-end justify-between h-full gap-2 flex-1" style={{ position: 'relative' }}>
      {/* Grid lines overlay */}
      <View 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          zIndex: 0,
        }}
      >
        {gridLines.map((percentage, index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              top: `${percentage}%`,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: '#E5E7EB', // gray-200
              opacity: 0.5,
            }}
            className="dark:bg-gray-700"
          />
        ))}
      </View>
      
      {/* Bars */}
      {data.map((item, index) => {
        const barHeight = max > 0 ? (item.value / max) * 100 : 0;
        const color = item.color || colors[index % colors.length];
        const formattedValue = formatCompactNumber(item.value);
        // Reserve at least 15% space at top for value label, adjust bar height accordingly
        const reservedTopSpace = 15;
        const adjustedBarHeight = Math.min(barHeight, 100 - reservedTopSpace);
        const emptySpace = 100 - adjustedBarHeight;
        
        return (
          <AnimatedBar
            key={`${item.label}-${index}`}
            item={item}
            index={index}
            adjustedBarHeight={adjustedBarHeight}
            emptySpace={emptySpace}
            color={color}
            formattedValue={formattedValue}
            currencySymbol={currencySymbol}
            animationSeed={animationSeed}
          />
        );
      })}
    </View>
  );

  return (
    <View className="w-full">
      <View className="flex-row" style={{ height }}>
        {showYAxis && (
          <View className="justify-between mr-3">
            {steps.map((value, index) => (
              <Text key={index} className="text-[10px] text-gray-500 dark:text-gray-400">
                {value > 0 ? value.toFixed(0) : '0'}
              </Text>
            ))}
          </View>
        )}
        <View className="flex-1">
          {chartContent}
        </View>
      </View>
      {showValues && (
        <View className="mt-3">
          <View className="flex-row justify-between">
            {data.map((item, index) => (
              <View key={index} className="flex-1 items-center">
                <Text className="text-xs text-gray-600 dark:text-gray-400 text-center" numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function AnimatedBar({
  item,
  index,
  adjustedBarHeight,
  emptySpace,
  color,
  formattedValue,
  currencySymbol,
  animationSeed,
}: {
  item: BarData;
  index: number;
  adjustedBarHeight: number;
  emptySpace: number;
  color: string;
  formattedValue: string;
  currencySymbol: string;
  animationSeed: number;
}) {
  // Animation values for each bar
  const barHeightAnimated = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const labelTranslateY = useSharedValue(-10);
  
  // Animated styles - use scaleY to grow from bottom
  // When scaleY is applied, we need to adjust the position to keep it anchored at bottom
  const barAnimatedStyle = useAnimatedStyle(() => {
    const scale = barHeightAnimated.value;
    // Calculate the height in pixels for proper positioning
    // Since we're using percentage, we'll use a different approach
    return {
      height: `${adjustedBarHeight * scale}%`,
    };
  });
  
  const labelAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: labelOpacity.value,
      transform: [{ translateY: labelTranslateY.value }],
    };
  });
  
  // Trigger animations with stagger
  useEffect(() => {
    // Reset values
    barHeightAnimated.value = 0;
    labelOpacity.value = 0;
    labelTranslateY.value = -10;
    
    const delay = index * 90;
    
    barHeightAnimated.value = withDelay(
      delay,
      withSpring(1, {
        damping: 15,
        stiffness: 110,
        mass: 0.8,
      })
    );
    
    labelOpacity.value = withDelay(
      delay + 180,
      withTiming(1, { duration: 350 })
    );
    labelTranslateY.value = withDelay(
      delay + 180,
      withSpring(0, {
        damping: 12,
        stiffness: 140,
      })
    );
  }, [animationSeed, index, barHeightAnimated, labelOpacity, labelTranslateY]);
  
  return (
    <View className="flex-1 items-center" style={{ height: '100%', zIndex: 1 }}>
      <View className="w-full" style={{ height: '100%', position: 'relative', justifyContent: 'flex-end' }}>
        {/* Empty space at top with value label */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${emptySpace}%`, minHeight: 20, zIndex: 2 }}>
          {item.value > 0 && (
            <Animated.View 
              className="w-full items-center justify-end" 
              style={[
                { height: '100%', paddingBottom: 2 },
                labelAnimatedStyle
              ]}
            >
              <Text className="text-[10px] font-semibold text-gray-900 dark:text-gray-100">
                {currencySymbol}{formattedValue}
              </Text>
            </Animated.View>
          )}
        </View>
        {/* Bar - positioned at bottom, grows upward */}
        <Animated.View
          className="w-full rounded-t-lg"
          style={[
            {
              backgroundColor: color,
              minHeight: item.value > 0 ? 4 : 0,
            },
            barAnimatedStyle,
          ]}
        />
      </View>
    </View>
  );
}

