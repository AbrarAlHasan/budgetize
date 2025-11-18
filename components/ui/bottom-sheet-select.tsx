import BottomSheet from "@/components/bottom-sheet";
import { cn } from "@/utils/cn";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
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

interface BottomSheetSelectProps {
  label?: string;
  options: SelectOption[];
  value?: string | number | null;
  onValueChange: (value: string | number) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export interface BottomSheetSelectRef {
  present: () => void;
  dismiss: () => void;
}

export const BottomSheetSelect = forwardRef<
  BottomSheetSelectRef,
  BottomSheetSelectProps
>(
  (
    {
      label,
      options,
      value,
      onValueChange,
      placeholder = "Select an option",
      error,
      className,
    },
    ref
  ) => {
    const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
    const selectedOption = options.find((opt) => opt.value === value);

    useImperativeHandle(ref, () => ({
      present: () => {
        bottomSheetRef.current?.present();
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    // Calculate snap points - use percentage for better responsiveness
    const snapPoints = useMemo(() => {
      // For small lists (1-3 items), use 40% of screen
      // For medium lists (4-6 items), use 60% of screen
      // For large lists (7+ items), use 80% of screen
      if (options.length <= 3) {
        return ["50%"];
      } else if (options.length <= 6) {
        return ["60%"];
      } else {
        return ["80%"];
      }
    }, [options.length]);

    const handleOpen = useCallback(() => {
      bottomSheetRef.current?.present();
    }, []);

    const handleClose = useCallback(() => {
      bottomSheetRef.current?.dismiss();
    }, []);

    const handleSelect = useCallback(
      (selectedValue: string | number) => {
        onValueChange(selectedValue);
        handleClose();
      },
      [onValueChange, handleClose]
    );

    const handleBottomSheetChange = useCallback(
      (index: number) => {
        if (index === -1) {
          handleClose();
        }
      },
      [handleClose]
    );

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
              !selectedOption && "text-gray-400 dark:text-gray-500"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
        {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}

        <BottomSheet
          bottomSheetModalRef={bottomSheetRef as React.RefObject<BottomSheetModalMethods>}
          snapPoints={snapPoints}
          index={0}
          onBottomSheetChange={handleBottomSheetChange}
          onClose={handleClose}
          containerStyle={{ padding: 0 }}
        >
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl flex-1 pb-20">
            {/* Header */}
            <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {label || "Select an option"}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <View>
              {options.map((item) => {
                const isSelected = value === item.value;
                return (
                  <TouchableOpacity
                    key={String(item.value)}
                    onPress={() => handleSelect(item.value)}
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
                        color={isSelected ? "#3B82F6" : "#6B7280"}
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
