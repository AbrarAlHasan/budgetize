import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTags, useDeleteTag } from '@/hooks/queries/use-tags';
import { Card } from '@/components/ui/card';
import { AddTagBottomSheet, AddTagBottomSheetRef } from '@/components/add-tag-bottom-sheet';
import { EditTagBottomSheet, EditTagBottomSheetRef } from '@/components/edit-tag-bottom-sheet';

export default function TagsManagementScreen() {
  const { data: tags, isLoading } = useTags();
  const deleteTag = useDeleteTag();
  const addTagBottomSheetRef = useRef<AddTagBottomSheetRef>(null);
  const editTagBottomSheetRef = useRef<EditTagBottomSheetRef>(null);
  const [selectedTag, setSelectedTag] = useState<{ id: number; name: string } | null>(null);

  const handleAddTag = () => {
    addTagBottomSheetRef.current?.present();
  };

  const handleEditTag = (tag: { id: number; name: string }) => {
    setSelectedTag(tag);
    editTagBottomSheetRef.current?.present();
  };

  const handleDeleteTag = (tagId: number, tagName: string) => {
    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete "${tagName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTag.mutateAsync(tagId);
              Alert.alert('Success', 'Tag deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete tag');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
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
          headerTitle: 'Manage Tags',
          headerBackTitle: 'Settings',
        }}
      />
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-6 pb-6">
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Tags
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Organize your transactions
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAddTag}
                className="bg-blue-600 rounded-xl px-4 py-3 flex-row items-center gap-2"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text className="text-white font-semibold">New</Text>
              </TouchableOpacity>
            </View>

            {/* Tags List */}
            {tags && tags.length > 0 ? (
              <View className="gap-3">
                {tags.map((tag) => (
                  <Card key={tag.id} className="p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-3">
                        <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                          <Ionicons name="pricetag" size={20} color="#3B82F6" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {tag.name}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        {/* Edit Button */}
                        <TouchableOpacity
                          onPress={() => handleEditTag({ id: tag.id, name: tag.name })}
                          className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil" size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Delete Button */}
                        <TouchableOpacity
                          onPress={() => handleDeleteTag(tag.id, tag.name)}
                          className="bg-red-50 dark:bg-red-900/30 rounded-lg p-2"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <Card className="p-8">
                <View className="items-center">
                  <View className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
                    <Ionicons name="pricetag-outline" size={48} color="#9CA3AF" />
                  </View>
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Tags Yet
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                    Create your first tag to start organizing your transactions
                  </Text>
                  <TouchableOpacity
                    onPress={handleAddTag}
                    className="bg-blue-600 rounded-xl px-6 py-3"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white font-semibold">Create First Tag</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}
          </View>
        </ScrollView>

        {/* Bottom Sheets */}
        <AddTagBottomSheet ref={addTagBottomSheetRef} />
        <EditTagBottomSheet 
          ref={editTagBottomSheetRef} 
          tagId={selectedTag?.id}
          initialName={selectedTag?.name}
        />
      </SafeAreaView>
    </>
  );
}

