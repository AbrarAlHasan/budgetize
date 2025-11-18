import { useTags, useUpdateTag } from "@/hooks/queries/use-tags";
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

export interface EditTagBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface EditTagBottomSheetProps {
  tagId?: number;
  initialName?: string;
  onTagUpdated?: (tagId: number) => void;
}

export const EditTagBottomSheet = forwardRef<
  EditTagBottomSheetRef,
  EditTagBottomSheetProps
>(({ tagId, initialName, onTagUpdated }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const [tagName, setTagName] = useState("");
  const updateTag = useUpdateTag();
  const { data: tags } = useTags();

  useEffect(() => {
    if (initialName) {
      setTagName(initialName);
    }
  }, [initialName]);

  useImperativeHandle(ref, () => ({
    present: () => {
      // Set the name again when presenting to ensure it's updated
      if (initialName) {
        setTagName(initialName);
      }
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      bottomSheetRef.current?.dismiss();
    },
  }), [initialName]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    setTagName("");
  }, []);

  const handleUpdate = async () => {
    if (!tagId) {
      Alert.alert("Error", "Tag ID is missing");
      return;
    }

    if (!tagName.trim()) {
      Alert.alert("Error", "Tag name is required");
      return;
    }

    // Check if tag name is unchanged
    if (tagName.trim() === initialName?.trim()) {
      Alert.alert("Info", "No changes made to tag name");
      return;
    }

    // Check if tag already exists (excluding current tag)
    if (
      tags?.some(
        (tag) =>
          tag.id !== tagId &&
          tag.name.toLowerCase() === tagName.trim().toLowerCase()
      )
    ) {
      Alert.alert("Error", "Tag with this name already exists");
      return;
    }

    try {
      await updateTag.mutateAsync({ id: tagId, name: tagName.trim() });
      Alert.alert("Success", "Tag updated successfully");
      setTagName("");
      if (onTagUpdated) {
        onTagUpdated(tagId);
      }
      handleClose();
    } catch (error) {
      Alert.alert("Error", "Failed to update tag");
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
            Edit Tag
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update tag name
          </Text>
        </View>

        {/* Divider */}
        <View className="h-px bg-gray-200 dark:bg-gray-800" />

        {/* Content */}
        <View className="px-6 py-6">
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Tag Name
            </Text>
            <BottomSheetTextInput
              value={tagName}
              onChangeText={setTagName}
              placeholder="e.g., Personal, Work, Travel"
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
            Tags help you organize and categorize your transactions for easier
            tracking.
          </Text>

          <Button
            onPress={handleUpdate}
            loading={updateTag.isPending}
            className="w-full"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base">
                Update Tag
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
});

