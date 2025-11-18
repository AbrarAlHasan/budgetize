import { useCreateTag, useTags } from "@/hooks/queries/use-tags";
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

export interface AddTagBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface AddTagBottomSheetProps {
  onTagCreated?: (tagId: number) => void;
}

export const AddTagBottomSheet = forwardRef<
  AddTagBottomSheetRef,
  AddTagBottomSheetProps
>(({ onTagCreated }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const [tagName, setTagName] = useState("");
  const createTag = useCreateTag();
  const { data: tags } = useTags();

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
    setTagName("");
  }, []);

  const handleCreate = async () => {
    if (!tagName.trim()) {
      Alert.alert("Error", "Tag name is required");
      return;
    }

    // Check if tag already exists
    if (
      tags?.some(
        (tag) => tag.name.toLowerCase() === tagName.trim().toLowerCase()
      )
    ) {
      Alert.alert("Error", "Tag with this name already exists");
      return;
    }

    try {
      const newTag = await createTag.mutateAsync({ name: tagName.trim() });
      Alert.alert("Success", "Tag created successfully");
      setTagName("");
      if (onTagCreated) {
        onTagCreated(newTag.id);
      }
      handleClose();
    } catch (error) {
      Alert.alert("Error", "Failed to create tag");
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
            Create New Tag
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
            onPress={handleCreate}
            loading={createTag.isPending}
            className="w-full"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base">
                Create Tag
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
});
