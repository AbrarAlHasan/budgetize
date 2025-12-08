import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import BottomSheet from './bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

export type DummyDataSize = 'small' | 'medium' | 'large';

export interface DummyDataSizeBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface DummyDataSizeBottomSheetProps {
  onSelect: (size: DummyDataSize) => void;
}

export const DummyDataSizeBottomSheet = forwardRef<
  DummyDataSizeBottomSheetRef,
  DummyDataSizeBottomSheetProps
>(({ onSelect }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useImperativeHandle(ref, () => ({
    present: () => {
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const handleSelect = (size: DummyDataSize) => {
    onSelect(size);
    bottomSheetRef.current?.dismiss();
  };

  const options = [
    {
      size: 'small' as DummyDataSize,
      label: 'Small',
      description: 'Last 3 months • 10 transactions per day',
      icon: 'calendar-outline' as const,
      color: '#10B981', // green
    },
    {
      size: 'medium' as DummyDataSize,
      label: 'Medium',
      description: 'Last 6 months • 15 transactions per day',
      icon: 'calendar' as const,
      color: '#3B82F6', // blue
    },
    {
      size: 'large' as DummyDataSize,
      label: 'Large',
      description: 'Last 24 months • 50 transactions per day',
      icon: 'calendar-sharp' as const,
      color: '#8B5CF6', // purple
    },
  ];

  return (
    <BottomSheet
      bottomSheetModalRef={bottomSheetRef as React.RefObject<BottomSheetModalMethods>}
      snapPoints={['40%']}
      index={0}
      onClose={() => bottomSheetRef.current?.dismiss()}
    >
      <View className="px-4 py-2">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Select Data Size
        </Text>

        {options.map((option) => (
          <TouchableOpacity
            key={option.size}
            onPress={() => handleSelect(option.size)}
            className="flex-row items-center p-4 mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-700"
            activeOpacity={0.7}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: `${option.color}20` }}
            >
              <Ionicons name={option.icon} size={24} color={option.color} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {option.label}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {option.description}
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
});

