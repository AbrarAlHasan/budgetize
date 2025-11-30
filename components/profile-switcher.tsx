import { useProfileStore } from "@/store/profile-store";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomSheet from "./bottom-sheet";

interface ProfileSwitcherProps {
  showCreateButton?: boolean;
}

const getGradientColors = (
  color: string | null,
  isDark: boolean
): [string, string] => {
  if (!color) {
    return isDark ? ["#10B981", "#059669"] : ["#10B981", "#059669"];
  }

  // Convert hex to RGB and create a darker variant
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Create darker variant (85% brightness)
  const darkerR = Math.floor(r * 0.85);
  const darkerG = Math.floor(g * 0.85);
  const darkerB = Math.floor(b * 0.85);

  return [color, `rgb(${darkerR}, ${darkerG}, ${darkerB})`];
};

export function ProfileSwitcher({
  showCreateButton = true,
}: ProfileSwitcherProps) {
  const { profiles, currentProfileId, switchProfile, loadProfiles } =
    useProfileStore();
  const queryClient = useQueryClient();
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme.colorScheme === "dark";

  const currentProfile = useMemo(() => {
    return profiles.find((p) => p.id === currentProfileId);
  }, [profiles, currentProfileId]);

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleSwitchProfile = useCallback(
    async (profileId: number) => {
      if (profileId === currentProfileId) {
        handleClose();
        return;
      }

      try {
        await switchProfile(profileId);
        await queryClient.invalidateQueries();
        handleClose();
      } catch (error) {
        console.error("Error switching profile:", error);
      }
    },
    [currentProfileId, switchProfile, queryClient, handleClose]
  );

  const handleCreateProfile = useCallback(() => {
    handleClose();
    router.push("/profiles/new");
  }, [handleClose]);

  if (!currentProfile) {
    return null;
  }

  const gradientColors = getGradientColors(currentProfile.color, isDark);

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.8}
        style={styles.switcherContainer}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientPill}
        >
          {/* Icon Badge */}
          <View style={styles.iconBadge}>
            {currentProfile.icon ? (
              <Text style={styles.iconEmoji}>{currentProfile.icon}</Text>
            ) : (
              <Ionicons name="person" size={14} color="#FFFFFF" />
            )}
          </View>

          {/* Profile Name - Compact */}
          <Text style={styles.profileName} numberOfLines={1}>
            {currentProfile.name}
          </Text>

          {/* Chevron - Smaller */}
          <Ionicons
            name="chevron-down"
            size={12}
            color="#FFFFFF"
            style={styles.chevron}
          />
        </LinearGradient>
      </TouchableOpacity>

      <BottomSheet
        bottomSheetModalRef={
          bottomSheetRef as React.RefObject<BottomSheetModalMethods>
        }
        snapPoints={["60%", "85%"]}
        index={0}
        onClose={handleClose}
      >
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Switch Profile
            </Text>
            <TouchableOpacity onPress={handleClose} className="p-2">
              <Ionicons
                name="close-circle"
                size={28}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            {profiles.map((profile) => {
              const isActive = profile.id === currentProfileId;
              const profileGradient = getGradientColors(profile.color, isDark);

              return (
                <TouchableOpacity
                  key={profile.id}
                  onPress={() => handleSwitchProfile(profile.id)}
                  activeOpacity={0.7}
                  style={styles.profileItem}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={profileGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeProfileCard}
                    >
                      <View className="flex-row items-center flex-1">
                        {profile.icon ? (
                          <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-4">
                            <Text className="text-2xl">{profile.icon}</Text>
                          </View>
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-4">
                            <Ionicons name="person" size={24} color="#FFFFFF" />
                          </View>
                        )}
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1">
                            <Text className="text-base font-bold text-white mr-2">
                              {profile.name}
                            </Text>
                            <View className="px-2 py-0.5 bg-white/30 rounded-full">
                              <Text className="text-xs font-semibold text-white">
                                Active
                              </Text>
                            </View>
                          </View>
                          {profile.description && (
                            <Text
                              className="text-sm text-white/80"
                              numberOfLines={1}
                            >
                              {profile.description}
                            </Text>
                          )}
                        </View>
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#FFFFFF"
                        />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View
                      className="flex-row items-center px-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      style={styles.inactiveProfileCard}
                    >
                      {profile.icon ? (
                        <View className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center mr-4">
                          <Text className="text-2xl">{profile.icon}</Text>
                        </View>
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center mr-4">
                          <Ionicons
                            name="person"
                            size={24}
                            color={isDark ? "#9CA3AF" : "#6B7280"}
                          />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {profile.name}
                        </Text>
                        {profile.description && (
                          <Text
                            className="text-sm text-gray-600 dark:text-gray-400"
                            numberOfLines={1}
                          >
                            {profile.description}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={isDark ? "#9CA3AF" : "#6B7280"}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {showCreateButton && (
            <TouchableOpacity
              onPress={handleCreateProfile}
              activeOpacity={0.8}
              className="mt-2"
            >
              <LinearGradient
                colors={["#3B82F6", "#2563EB"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButton}
              >
                <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                <Text className="text-white font-semibold ml-2 text-base">
                  Create New Profile
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  switcherContainer: {
    alignSelf: "flex-start",
  },
  gradientPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  iconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  iconEmoji: {
    fontSize: 11,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginRight: 4,
    maxWidth: 100,
  },
  chevron: {
    opacity: 0.85,
    marginLeft: 2,
  },
  profileItem: {
    marginBottom: 12,
  },
  activeProfileCard: {
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  inactiveProfileCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
