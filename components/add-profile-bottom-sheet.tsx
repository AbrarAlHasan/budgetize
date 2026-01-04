import React, { forwardRef, useImperativeHandle, useRef, useCallback, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import BottomSheet from '@/components/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useCreateProfile } from '@/hooks/queries/use-profiles';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';

export interface AddProfileBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

export const AddProfileBottomSheet = forwardRef<AddProfileBottomSheetRef, {}>((props, ref) => {
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const [profileName, setProfileName] = useState('');
  const createProfile = useCreateProfile();

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
    setProfileName('');
  }, []);

  const handleCreate = async () => {
    if (!profileName.trim()) {
      Alert.alert('Error', 'Profile name is required');
      return;
    }

    try {
      await createProfile.mutateAsync({
        name: profileName.trim(),
        isDefault: false,
      });
      setProfileName('');
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create profile');
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
      bottomSheetModalRef={bottomSheetRef as React.RefObject<BottomSheetModalMethods>}
      snapPoints={['50%', '90%']}
      index={0}
      onBottomSheetChange={handleBottomSheetChange}
      onClose={handleClose}
      containerStyle={{ padding: 0 }}
    >
      <View className="bg-white dark:bg-gray-900 flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-5">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create New Profile
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize your finances by context
          </Text>
        </View>

        {/* Divider */}
        <View className="h-px bg-gray-200 dark:bg-gray-800" />

        {/* Content */}
        <View className="px-6 py-6">
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Profile Name
            </Text>
            <BottomSheetTextInput
              value={profileName}
              onChangeText={setProfileName}
              placeholder="e.g., Personal, Work, Trip"
              placeholderTextColor="#9CA3AF"
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: '#FFFFFF',
                color: '#111827',
                fontSize: 16,
              }}
            />
          </View>

          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Profiles help you separate finances for different purposes like personal expenses, work, trips, or shared events.
          </Text>

          <Button
            onPress={handleCreate}
            loading={createProfile.isPending}
            className="w-full"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base">
                Create Profile
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
});

AddProfileBottomSheet.displayName = 'AddProfileBottomSheet';

