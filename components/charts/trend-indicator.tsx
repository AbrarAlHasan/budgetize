import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrendIndicatorProps {
  value: number;
  percent: number;
  label?: string;
  showArrow?: boolean;
}

export function TrendIndicator({ 
  value, 
  percent, 
  label,
  showArrow = true 
}: TrendIndicatorProps) {
  const isPositive = value >= 0;
  const color = isPositive ? '#10B981' : '#EF4444';
  const icon = isPositive ? 'arrow-up' : 'arrow-down';

  return (
    <View className="flex-row items-center gap-1">
      {showArrow && (
        <Ionicons name={icon as any} size={14} color={color} />
      )}
      <Text 
        className="text-sm font-semibold"
        style={{ color }}
      >
        {Math.abs(percent).toFixed(1)}%
      </Text>
      {label && (
        <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          {label}
        </Text>
      )}
    </View>
  );
}

