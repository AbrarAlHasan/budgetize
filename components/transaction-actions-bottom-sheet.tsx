import BottomSheet from "@/components/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useColorScheme } from "nativewind";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface TransactionActionsBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface TransactionActionsBottomSheetProps {
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const TransactionActionsBottomSheet = forwardRef<
  TransactionActionsBottomSheetRef,
  TransactionActionsBottomSheetProps
>(({ onEdit, onDelete, onDuplicate }, ref) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);

  useImperativeHandle(ref, () => ({
    present: () => {
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const handleEdit = () => {
    bottomSheetRef.current?.dismiss();
    onEdit();
  };

  const handleDelete = () => {
    bottomSheetRef.current?.dismiss();
    onDelete();
  };

  const handleDuplicate = () => {
    bottomSheetRef.current?.dismiss();
    onDuplicate();
  };

  return (
    <BottomSheet
      bottomSheetModalRef={
        bottomSheetRef as React.RefObject<BottomSheetModalMethods>
      }
      snapPoints={["40%"]}
      index={0}
      containerStyle={{ padding: 0 }}
    >
      <View className="bg-white dark:bg-gray-800 rounded-t-3xl pb-5">
        {/* Header */}
        <View className="px-5 pb-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Transaction Actions
          </Text>
        </View>

        {/* Actions */}
        <View className="py-2">
          {/* Edit */}
          <TouchableOpacity
            onPress={handleEdit}
            className="px-5 py-4 flex-row items-center active:bg-gray-100 dark:active:bg-gray-700"
          >
            <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-4">
              <Ionicons name="create-outline" size={20} color="#3B82F6" />
            </View>
            <Text className="text-base text-gray-900 dark:text-gray-100 flex-1">
              Edit
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>

          {/* Duplicate */}
          <TouchableOpacity
            onPress={handleDuplicate}
            className="px-5 py-4 flex-row items-center active:bg-gray-100 dark:active:bg-gray-700"
          >
            <View className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 items-center justify-center mr-4">
              <Ionicons name="copy-outline" size={20} color="#10B981" />
            </View>
            <Text className="text-base text-gray-900 dark:text-gray-100 flex-1">
              Duplicate
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={handleDelete}
            className="px-5 py-4 flex-row items-center active:bg-gray-100 dark:active:bg-gray-700"
          >
            <View className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 items-center justify-center mr-4">
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </View>
            <Text className="text-base text-red-600 dark:text-red-400 flex-1">
              Delete
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
});

TransactionActionsBottomSheet.displayName = "TransactionActionsBottomSheet";
