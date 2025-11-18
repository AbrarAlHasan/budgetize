import { useCreateCategory, useCategories } from "@/hooks/queries/use-categories";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Alert, Text, View } from "react-native";
import BottomSheet from "./bottom-sheet";
import { Button } from "./ui/button";

export interface AddCategoryBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface AddCategoryBottomSheetProps {
  onCategoryCreated?: (categoryId: number) => void;
}

export const AddCategoryBottomSheet = forwardRef<
  AddCategoryBottomSheetRef,
  AddCategoryBottomSheetProps
>(({ onCategoryCreated }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const [categoryName, setCategoryName] = useState("");
  const createCategory = useCreateCategory();
  const { data: categories } = useCategories();

  useImperativeHandle(ref, () => ({
    present: () => {
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    setCategoryName("");
  }, []);

  const handleCreate = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    // Check if category already exists
    if (
      categories?.some(
        (category) => category.name.toLowerCase() === categoryName.trim().toLowerCase()
      )
    ) {
      Alert.alert("Error", "Category with this name already exists");
      return;
    }

    try {
      const newCategory = await createCategory.mutateAsync({ name: categoryName.trim() });
      Alert.alert("Success", "Category created successfully");
      setCategoryName("");
      if (onCategoryCreated) {
        onCategoryCreated(newCategory.id);
      }
      handleClose();
    } catch (error) {
      Alert.alert("Error", "Failed to create category");
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
            Create New Category
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize your transactions
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
            onPress={handleCreate}
            loading={createCategory.isPending}
            className="w-full"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base">
                Create Category
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
});

