import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { cn } from '@/utils/cn';

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string | number | null;
  onValueChange: (value: string | number) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export function Select({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  error,
  className,
}: SelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View className={cn('mb-4', className)}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className={cn(
          'border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2',
          'bg-white dark:bg-gray-800',
          error && 'border-red-500'
        )}
      >
        <Text className={cn(
          'text-gray-900 dark:text-gray-100',
          !selectedOption && 'text-gray-400 dark:text-gray-500'
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
      </TouchableOpacity>
      {error && (
        <Text className="mt-1 text-sm text-red-500">{error}</Text>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View className="bg-white dark:bg-gray-800 rounded-lg w-4/5 max-h-96">
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                  className={cn(
                    'px-4 py-3 border-b border-gray-200 dark:border-gray-700',
                    value === item.value && 'bg-blue-50 dark:bg-blue-900'
                  )}
                >
                  <Text className={cn(
                    'text-gray-900 dark:text-gray-100',
                    value === item.value && 'font-semibold text-blue-600 dark:text-blue-400'
                  )}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

