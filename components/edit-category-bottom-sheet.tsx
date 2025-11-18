import { useCategories, useUpdateCategory } from "@/hooks/queries/use-categories";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Alert, Text, View } from "react-native";
import BottomSheet from "./bottom-sheet";
import { Button } from "./ui/button";

export interface EditCategoryBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface EditCategoryBottomSheetProps {
  categoryId?: number;
  initialName?: string;
  onCategoryUpdated?: (categoryId: number) => void;
}

export const EditCategoryBottomSheet = forwardRef<
  EditCategoryBottomSheetRef,
  EditCategoryBottomSheetProps
>(({ categoryId, initialName, onCategoryUpdated }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const [categoryName, setCategoryName] = useState("");
  const updateCategory = useUpdateCategory();
  const { data: categories } = useCategories();

  useEffect(() => {
    if (initialName) {
      setCategoryName(initialName);
    }
  }, [initialName]);

  useImperativeHandle(ref, () => ({
    present: () => {
      // Set the name again when presenting to ensure it's updated
      if (initialName) {
        setCategoryName(initialName);
      }
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      bottomSheetRef.current?.dismiss();
    },
  }), [initialName]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    setCategoryName("");
  }, []);

  const handleUpdate = async () => {
    if (!categoryId) {
      Alert.alert("Error", "Category ID is missing");
      return;
    }

    if (!categoryName.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    // Check if category name is unchanged
    if (categoryName.trim() === initialName?.trim()) {
      Alert.alert("Info", "No changes made to category name");
      return;
    }

    // Check if category already exists (excluding current category)
    if (
      categories?.some(
        (category) =>
          category.id !== categoryId &&
          category.name.toLowerCase() === categoryName.trim().toLowerCase()
      )
    ) {
      Alert.alert("Error", "Category with this name already exists");
      return;
    }

    try {
      await updateCategory.mutateAsync({ id: categoryId, name: categoryName.trim() });
      Alert.alert("Success", "Category updated successfully");
      setCategoryName("");
      if (onCategoryUpdated) {
        onCategoryUpdated(categoryId);
      }
      handleClose();
    } catch (error) {
      Alert.alert("Error", "Failed to update category");
    }
  };

  const handleBottomSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        handleClose();
      }
    },
    [handleClose]
  );

  return (
    <BottomSheet
      bottomSheetModalRef={
        bottomSheetRef as React.RefObject<BottomSheetModalMethods>
      }
      snapPoints={["50%", "90%"]}
      index={0}
      onBottomSheetChange={handleBottomSheetChange}
      onClose={handleClose}
      containerStyle={{ padding: 0 }}
    >
      <View className="bg-white dark:bg-gray-900 flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-5">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Edit Category
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update category name
          </Text>
        </View>

        {/* Divider */}
        <View className="h-px bg-gray-200 dark:bg-gray-800" />

        {/* Content */}
        <View className="px-6 py-6">
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Category Name
            </Text>
            <BottomSheetTextInput
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="e.g., Food, Transport, Entertainment"
              placeholderTextColor="#9CA3AF"
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: "#FFFFFF",
                color: "#111827",
                fontSize: 16,
              }}
            />
          </View>

          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Categories help you organize and categorize your transactions for easier
            tracking.
          </Text>

          <Button
            onPress={handleUpdate}
            loading={updateCategory.isPending}
            className="w-full"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base">
                Update Category
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
});

