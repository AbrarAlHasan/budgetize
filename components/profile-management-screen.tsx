import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfiles, useDeleteProfile, useSetDefaultProfile, useSwitchProfile } from '@/hooks/queries/use-profiles';
import { useProfileStore } from '@/store/profile-store';
import { Card } from '@/components/ui/card';
import { AddProfileBottomSheet, AddProfileBottomSheetRef } from '@/components/add-profile-bottom-sheet';
import { EditProfileBottomSheet, EditProfileBottomSheetRef } from '@/components/edit-profile-bottom-sheet';
import { Profile } from '@/repositories/profile.repository';

export function ProfileManagementScreen() {
  const { data: profiles, isLoading } = useProfiles();
  const activeProfileId = useProfileStore((state) => state.activeProfileId);
  const deleteProfile = useDeleteProfile();
  const setDefaultProfile = useSetDefaultProfile();
  const switchProfile = useSwitchProfile();
  const addProfileBottomSheetRef = useRef<AddProfileBottomSheetRef>(null);
  const editProfileBottomSheetRef = useRef<EditProfileBottomSheetRef>(null);
  const [selectedProfile, setSelectedProfile] = useState<{ id: number; name: string } | null>(null);

  const handleAddProfile = () => {
    addProfileBottomSheetRef.current?.present();
  };

  const handleEditProfile = (profile: Profile) => {
    setSelectedProfile({ id: profile.id, name: profile.name });
    editProfileBottomSheetRef.current?.present();
  };

  const handleDeleteProfile = (profile: Profile) => {
    if (profiles && profiles.length <= 1) {
      Alert.alert('Error', 'Cannot delete the only profile');
      return;
    }

    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete "${profile.name}""? This will permanently delete all data associated with this profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProfile.mutateAsync(profile.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete profile');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (profile: Profile) => {
    try {
      await setDefaultProfile.mutateAsync(profile.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to set default profile');
    }
  };

  const handleSwitchProfile = async (profile: Profile) => {
    if (profile.id === activeProfileId) return;
    
    try {
      await switchProfile.mutateAsync(profile.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to switch profile');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Manage Profiles',
          headerBackTitle: 'Settings',
        }}
      />
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top', 'bottom']}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-6 pb-6">
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Profiles
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Organize your finances by context
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAddProfile}
                className="bg-blue-600 rounded-xl px-4 py-3 flex-row items-center gap-2"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text className="text-white font-semibold">New</Text>
              </TouchableOpacity>
            </View>

            {/* Profiles List */}
            {profiles && profiles.length > 0 ? (
              <View className="gap-3">
                {profiles.map((profile) => {
                  const isActive = profile.id === activeProfileId;
                  const isDefault = profile.is_default === 1;

                  return (
                    <Card key={profile.id} className="p-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 flex-row items-center gap-3">
                          <View className="bg-indigo-100 dark:bg-indigo-900/30 rounded-full p-2">
                            <Ionicons name="people" size={20} color="#6366F1" />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center gap-2 mb-1">
                              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {profile.name}
                              </Text>
                              {isDefault && (
                                <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                  <Text className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                    Default
                                  </Text>
                                </View>
                              )}
                              {isActive && (
                                <View className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                  <Text className="text-xs font-medium text-green-700 dark:text-green-300">
                                    Active
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {isActive ? 'Currently viewing this profile' : 'Tap to switch'}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-2">
                          {/* Switch Button - only show if not active */}
                          {!isActive && (
                            <TouchableOpacity
                              onPress={() => handleSwitchProfile(profile)}
                              className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2"
                              activeOpacity={0.7}
                            >
                              <Ionicons name="swap-horizontal" size={18} color="#22C55E" />
                            </TouchableOpacity>
                          )}

                          {/* Set Default Button - only show if not default */}
                          {!isDefault && (
                            <TouchableOpacity
                              onPress={() => handleSetDefault(profile)}
                              className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2"
                              activeOpacity={0.7}
                            >
                              <Ionicons name="star-outline" size={18} color="#3B82F6" />
                            </TouchableOpacity>
                          )}

                          {/* Edit Button */}
                          <TouchableOpacity
                            onPress={() => handleEditProfile(profile)}
                            className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2"
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil" size={18} color="#6B7280" />
                          </TouchableOpacity>

                          {/* Delete Button - only show if more than one profile */}
                          {profiles.length > 1 && (
                            <TouchableOpacity
                              onPress={() => handleDeleteProfile(profile)}
                              className="bg-red-50 dark:bg-red-900/30 rounded-lg p-2"
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <Card className="p-8">
                <View className="items-center">
                  <View className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
                    <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                  </View>
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Profiles Yet
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                    Create your first profile to start organizing your finances by context
                  </Text>
                  <TouchableOpacity
                    onPress={handleAddProfile}
                    className="bg-blue-600 rounded-xl px-6 py-3"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white font-semibold">Create First Profile</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}
          </View>
        </ScrollView>

        {/* Bottom Sheets */}
        <AddProfileBottomSheet ref={addProfileBottomSheetRef} />
        <EditProfileBottomSheet
          ref={editProfileBottomSheetRef}
          profileId={selectedProfile?.id}
          initialName={selectedProfile?.name}
        />
      </SafeAreaView>
    </>
  );
}
