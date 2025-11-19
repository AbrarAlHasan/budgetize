import BottomSheet from "@/components/bottom-sheet";
import { cn } from "@/utils/cn";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useColorScheme } from "nativewind";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface SelectOption {
  label: string;
  value: string | number;
}

interface BottomSheetMultiSelectProps {
  label?: string;
  options: SelectOption[];
  value?: (string | number)[];
  onValueChange: (value: (string | number)[]) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  showSelectAll?: boolean;
}

export interface BottomSheetMultiSelectRef {
  present: () => void;
  dismiss: () => void;
}

export const BottomSheetMultiSelect = forwardRef<
  BottomSheetMultiSelectRef,
  BottomSheetMultiSelectProps
>(
  (
    {
      label,
      options,
      value = [],
      onValueChange,
      placeholder = "Select options",
      error,
      className,
      showSelectAll = true,
    },
    ref
  ) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
    const selectedValues = value || [];

    useImperativeHandle(ref, () => ({
      present: () => {
        bottomSheetRef.current?.present();
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    // Calculate snap points
    const snapPoints = useMemo(() => {
      if (options.length <= 3) {
        return ["60%"];
      } else if (options.length <= 6) {
        return ["70%"];
      } else {
        return ["85%"];
      }
    }, [options.length]);

    const handleOpen = useCallback(() => {
      bottomSheetRef.current?.present();
    }, []);

    const handleClose = useCallback(() => {
      bottomSheetRef.current?.dismiss();
    }, []);

    const handleToggle = useCallback(
      (selectedValue: string | number) => {
        const newValues = selectedValues.includes(selectedValue)
          ? selectedValues.filter((v) => v !== selectedValue)
          : [...selectedValues, selectedValue];
        onValueChange(newValues);
      },
      [selectedValues, onValueChange]
    );

    const handleSelectAll = useCallback(() => {
      const allValues = options.map((opt) => opt.value);
      onValueChange(allValues);
    }, [options, onValueChange]);

    const handleDeselectAll = useCallback(() => {
      onValueChange([]);
    }, [onValueChange]);

    const allSelected = selectedValues.length === options.length && options.length > 0;
    const noneSelected = selectedValues.length === 0;

    const getDisplayText = () => {
      if (selectedValues.length === 0) {
        return placeholder;
      }
      if (selectedValues.length === 1) {
        const option = options.find((opt) => opt.value === selectedValues[0]);
        return option?.label || placeholder;
      }
      return `${selectedValues.length} selected`;
    };

    return (
      <View className={cn("mb-4", className)}>
        {label && (
          <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </Text>
        )}
        <TouchableOpacity
          onPress={handleOpen}
          className={cn(
            "border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3",
            "bg-white dark:bg-gray-800 flex-row items-center justify-between",
            error && "border-red-500"
          )}
        >
          <Text
            className={cn(
              "text-gray-900 dark:text-gray-100 flex-1",
              selectedValues.length === 0 && "text-gray-400 dark:text-gray-500"
            )}
          >
            {getDisplayText()}
          </Text>
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color={isDark ? "#9CA3AF" : "#6B7280"} 
          />
        </TouchableOpacity>
        {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}

        <BottomSheet
          bottomSheetModalRef={bottomSheetRef as React.RefObject<BottomSheetModalMethods>}
          snapPoints={snapPoints}
          index={0}
          onClose={handleClose}
          containerStyle={{ padding: 0 }}
        >
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl flex-1 pb-20">
            {/* Header */}
            <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {label || "Select options"}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={isDark ? "#9CA3AF" : "#6B7280"} 
                />
              </TouchableOpacity>
            </View>

            {/* Select All / Deselect All */}
            {showSelectAll && options.length > 0 && (
              <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-row gap-3">
                <TouchableOpacity
                  onPress={allSelected ? handleDeselectAll : handleSelectAll}
                  className="flex-1"
                >
                  <Text className="text-base font-medium text-blue-600 dark:text-blue-400">
                    {allSelected ? "Deselect All" : "Select All"}
                  </Text>
                </TouchableOpacity>
                {selectedValues.length > 0 && (
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedValues.length} selected
                  </Text>
                )}
              </View>
            )}

            {/* Options List */}
            <View>
              {options.map((item) => {
                const isSelected = selectedValues.includes(item.value);
                return (
                  <TouchableOpacity
                    key={String(item.value)}
                    onPress={() => handleToggle(item.value)}
                    className={cn(
                      "px-4 py-4 flex-row items-center justify-between",
                      "border-b border-gray-200 dark:border-gray-700",
                      isSelected && "bg-blue-50 dark:bg-blue-900/30"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-base text-gray-900 dark:text-gray-100",
                        isSelected && "font-semibold text-blue-600 dark:text-blue-400"
                      )}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#3B82F6"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </BottomSheet>
      </View>
    );
  }
);

