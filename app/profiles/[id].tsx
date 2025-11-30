import { useProfileStore } from "@/store/profile-store";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PROFILE_ICONS = [
  "👤",
  "👨",
  "👩",
  "👨‍💼",
  "👩‍💼",
  "👨‍🎓",
  "👩‍🎓",
  "🏠",
  "🚗",
  "✈️",
  "🏖️",
  "💼",
  "💰",
  "🎯",
  "🏋️",
  "🎨",
  "📚",
];

const PROFILE_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
  "#14B8A6",
  "#A855F7",
  "#F43F5E",
  "#FB923C",
  "#22C55E",
];

export default function ProfileFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  // Handle "new" or "create" as create mode, otherwise parse as number for edit
  const isCreateRoute = params.id === "new" || params.id === "create";
  const profileId = isCreateRoute ? null : (params.id ? parseInt(params.id, 10) : null);
  const isEditMode = !!profileId && !isCreateRoute;

  const { profiles, createProfile, updateProfile, deleteProfile, currentProfileId } =
    useProfileStore();
  const queryClient = useQueryClient();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const profile = isEditMode ? profiles.find((p) => p.id === profileId) : null;
  const isActive = profileId === currentProfileId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load profile data in edit mode
  useEffect(() => {
    if (profile && isEditMode) {
      setName(profile.name);
      setDescription(profile.description || "");
      setSelectedIcon(profile.icon);
      setSelectedColor(profile.color);
    }
  }, [profile, isEditMode]);

  // Show not found state in edit mode
  if (isEditMode && !profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <Text className="text-gray-600 dark:text-gray-400">
          Profile not found
        </Text>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a profile name");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && profileId) {
        await updateProfile(profileId, {
          name: name.trim(),
          description: description.trim() || null,
          icon: selectedIcon,
          color: selectedColor,
        });
      } else {
        await createProfile({
          name: name.trim(),
          description: description.trim() || null,
          icon: selectedIcon,
          color: selectedColor,
        });
      }
      await queryClient.invalidateQueries();
      router.back();
    } catch (error) {
      Alert.alert("Error", isEditMode ? "Failed to update profile" : "Failed to create profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!isEditMode || !profileId) return;

    Alert.alert(
      "Delete Profile",
      `Are you sure you want to delete "${profile?.name}"? This will permanently delete all data in this profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProfile(profileId);
              await queryClient.invalidateQueries();
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete profile");
            }
          },
        },
      ]
    );
  };

  const getHeaderColor = (color: string | null): string => {
    if (!color) {
      return isDark ? "#111827" : "#3B82F6";
    }
    return color;
  };

  const headerColor = getHeaderColor(selectedColor || profile?.color || null);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isEditMode ? "Edit Profile" : "Create Profile",
          headerStyle: {
            backgroundColor: headerColor,
          },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerRight: isEditMode
            ? () => (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={{
                    marginRight: 16,
                    width: 44,
                    height: 44,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5 py-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Active Badge - Only in edit mode */}
          {isEditMode && isActive && (
            <View className="mb-6">
              <View className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                  <Text className="text-blue-800 dark:text-blue-200 font-semibold ml-2">
                    This is your currently active profile
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Preview Card */}
          {(name || selectedIcon || selectedColor || profile) && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Preview
              </Text>
              <View
                className="rounded-3xl p-6"
                style={{
                  backgroundColor:
                    selectedColor ||
                    profile?.color ||
                    (isDark ? "#1F2937" : "#3B82F6"),
                  shadowColor: selectedColor || profile?.color || "#3B82F6",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <View className="flex-row items-center">
                  {selectedIcon || profile?.icon ? (
                    <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mr-4">
                      <Text className="text-3xl">
                        {selectedIcon || profile?.icon}
                      </Text>
                    </View>
                  ) : (
                    <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mr-4">
                      <Ionicons name="person" size={32} color="#FFFFFF" />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-white">
                      {name || "Profile Name"}
                    </Text>
                    {description && (
                      <Text className="text-sm text-white/90 mt-1">
                        {description}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Name Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Profile Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., Personal, Work, Trip"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-gray-100 text-base"
              autoFocus={!isEditMode}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            />
          </View>

          {/* Description Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Description (Optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description for this profile"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              multiline
              numberOfLines={3}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-gray-100 text-base"
              textAlignVertical="top"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
                minHeight: 100,
              }}
            />
          </View>

          {/* Icon Selection */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Icon (Optional)
            </Text>
            <View className="flex-row flex-wrap">
              {PROFILE_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  onPress={() =>
                    setSelectedIcon(selectedIcon === icon ? null : icon)
                  }
                  activeOpacity={0.7}
                  className={`w-14 h-14 items-center justify-center rounded-2xl mr-3 mb-3 ${
                    selectedIcon === icon
                      ? "bg-blue-500 dark:bg-blue-600"
                      : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                  }`}
                  style={{
                    shadowColor: selectedIcon === icon ? "#3B82F6" : "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: selectedIcon === icon ? 0.3 : 0.05,
                    shadowRadius: 4,
                    elevation: selectedIcon === icon ? 4 : 2,
                  }}
                >
                  <Text className="text-2xl">{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color Selection */}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Color (Optional)
            </Text>
            <View className="flex-row flex-wrap">
              {PROFILE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() =>
                    setSelectedColor(selectedColor === color ? null : color)
                  }
                  activeOpacity={0.7}
                  className="mr-3 mb-3"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: color,
                    borderWidth: selectedColor === color ? 4 : 0,
                    borderColor: isDark ? "#FFFFFF" : "#000000",
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: selectedColor === color ? 0.4 : 0.2,
                    shadowRadius: 8,
                    elevation: selectedColor === color ? 6 : 3,
                  }}
                />
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            activeOpacity={0.8}
            className="mb-6"
          >
            {isSubmitting || !name.trim() ? (
              <View className="py-4 rounded-2xl bg-gray-300 dark:bg-gray-700 items-center">
                {isSubmitting ? (
                  <ActivityIndicator color="#6B7280" />
                ) : (
                  <Text className="text-gray-600 dark:text-gray-400 font-semibold text-base">
                    {isEditMode ? "Update Profile" : "Create Profile"}
                  </Text>
                )}
              </View>
            ) : (
              <View
                className="py-4 rounded-2xl items-center"
                style={{
                  backgroundColor:
                    selectedColor ||
                    profile?.color ||
                    (isDark ? "#1F2937" : "#3B82F6"),
                  shadowColor: selectedColor || profile?.color || "#3B82F6",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Text className="text-white font-bold text-lg">
                  {isEditMode ? "Update Profile" : "Create Profile"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
