import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './bottom-sheet';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { useColorScheme } from 'nativewind';

export type DummyDataSize = 'small' | 'medium' | 'large' | 'huge';

export interface DummyDataSizeConfig {
  months: number;
  transactionsPerDay: number;
  label: string;
  description: string;
}

export const DUMMY_DATA_SIZES: Record<DummyDataSize, DummyDataSizeConfig> = {
  small: {
    months: 3,
    transactionsPerDay: 10,
    label: 'Small',
    description: '3 months • 10 transactions/day',
  },
  medium: {
    months: 6,
    transactionsPerDay: 15,
    label: 'Medium',
    description: '6 months • 15 transactions/day',
  },
  large: {
    months: 12,
    transactionsPerDay: 25,
    label: 'Large',
    description: '12 months • 25 transactions/day',
  },
  huge: {
    months: 24,
    transactionsPerDay: 50,
    label: 'Huge',
    description: '24 months • 50 transactions/day',
  },
};

interface DummyDataSizeSelectorProps {
  bottomSheetRef: React.RefObject<BottomSheetModalMethods>;
  onSelectSize: (size: DummyDataSize) => void;
}

export function DummyDataSizeSelector({
  bottomSheetRef,
  onSelectSize,
}: DummyDataSizeSelectorProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme.colorScheme === 'dark';

  const handleSelect = useCallback(
    (size: DummyDataSize) => {
      onSelectSize(size);
      bottomSheetRef.current?.dismiss();
    },
    [onSelectSize, bottomSheetRef]
  );

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  return (
    <BottomSheet
      bottomSheetModalRef={bottomSheetRef}
      snapPoints={['50%']}
      index={0}
      onClose={handleClose}
    >
      <View className="px-4 py-2">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Select Data Size
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons
              name="close"
              size={24}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>

        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose how much dummy data to generate for the current profile
        </Text>

        {Object.entries(DUMMY_DATA_SIZES).map(([size, config]) => (
          <TouchableOpacity
            key={size}
            onPress={() => handleSelect(size as DummyDataSize)}
            className="flex-row items-center justify-between px-4 py-4 mb-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {config.label}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {config.description}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                ~{Math.round(config.months * 30 * config.transactionsPerDay)} total transactions
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
}

