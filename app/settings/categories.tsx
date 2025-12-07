import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategories, useDeleteCategory } from '@/hooks/queries/use-categories';
import { Card } from '@/components/ui/card';
import { AddCategoryBottomSheet, AddCategoryBottomSheetRef } from '@/components/add-category-bottom-sheet';
import { EditCategoryBottomSheet, EditCategoryBottomSheetRef } from '@/components/edit-category-bottom-sheet';

export default function CategoriesManagementScreen() {
  const { data: categories, isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const addCategoryBottomSheetRef = useRef<AddCategoryBottomSheetRef>(null);
  const editCategoryBottomSheetRef = useRef<EditCategoryBottomSheetRef>(null);
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string } | null>(null);

  const handleAddCategory = () => {
    addCategoryBottomSheetRef.current?.present();
  };

  const handleEditCategory = (category: { id: number; name: string }) => {
    setSelectedCategory(category);
    editCategoryBottomSheetRef.current?.present();
  };

  const handleDeleteCategory = (categoryId: number, categoryName: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${categoryName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory.mutateAsync(categoryId);
              Alert.alert('Success', 'Category deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete category');
            }
          },
        },
      ]
    );
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
          headerTitle: 'Manage Categories',
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
                  Categories
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Organize your transactions
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAddCategory}
                className="bg-blue-600 rounded-xl px-4 py-3 flex-row items-center gap-2"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text className="text-white font-semibold">New</Text>
              </TouchableOpacity>
            </View>

            {/* Categories List */}
            {categories && categories.length > 0 ? (
              <View className="gap-3">
                {categories.map((category) => (
                  <Card key={category.id} className="p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-3">
                        <View className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-2">
                          <Ionicons name="apps" size={20} color="#9333EA" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {category.name}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        {/* Edit Button */}
                        <TouchableOpacity
                          onPress={() => handleEditCategory({ id: category.id, name: category.name })}
                          className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil" size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Delete Button */}
                        <TouchableOpacity
                          onPress={() => handleDeleteCategory(category.id, category.name)}
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
                    <Ionicons name="apps-outline" size={48} color="#9CA3AF" />
                  </View>
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Categories Yet
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                    Create your first category to start organizing your transactions
                  </Text>
                  <TouchableOpacity
                    onPress={handleAddCategory}
                    className="bg-blue-600 rounded-xl px-6 py-3"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white font-semibold">Create First Category</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}
          </View>
        </ScrollView>

        {/* Bottom Sheets */}
        <AddCategoryBottomSheet ref={addCategoryBottomSheetRef} />
        <EditCategoryBottomSheet 
          ref={editCategoryBottomSheetRef} 
          categoryId={selectedCategory?.id}
          initialName={selectedCategory?.name}
        />
      </SafeAreaView>
    </>
  );
}

