import { useProfileStore } from "@/store/profile-store";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getGradientColors = (
  color: string | null,
  isDark: boolean
): [string, string] => {
  if (!color) {
    return isDark ? ["#10B981", "#059669"] : ["#3B82F6", "#2563EB"];
  }

  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const darkerR = Math.floor(r * 0.85);
  const darkerG = Math.floor(g * 0.85);
  const darkerB = Math.floor(b * 0.85);

  return [color, `rgb(${darkerR}, ${darkerG}, ${darkerB})`];
};

export default function ProfilesScreen() {
  const {
    profiles,
    currentProfileId,
    isLoading,
    loadProfiles,
    switchProfile,
    deleteProfile,
  } = useProfileStore();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme();
  const isDark = colorScheme?.colorScheme === "dark";

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadProfiles is stable from Zustand store, no need to include in deps

  const handleSwitchProfile = async (profileId: number) => {
    if (profileId === currentProfileId) {
      return;
    }

    try {
      await switchProfile(profileId);
      await queryClient.invalidateQueries();
    } catch (error) {
      Alert.alert("Error", "Failed to switch profile");
    }
  };

  const handleDeleteProfile = (profile: { id: number; name: string }) => {
    if (profiles.length === 1) {
      Alert.alert(
        "Cannot Delete",
        "You must have at least one profile. Please create another profile before deleting this one."
      );
      return;
    }

    Alert.alert(
      "Delete Profile",
      `Are you sure you want to delete "${profile.name}"? This will permanently delete all data in this profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProfile(profile.id);
              await queryClient.invalidateQueries();
            } catch (error) {
              Alert.alert("Error", "Failed to delete profile");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={["top"]}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Profiles",
          headerLargeTitle: false,
          headerTransparent: false,
          headerBackTitle: "",
          headerStyle: {
            backgroundColor: isDark ? "#000000" : "#FFFFFF",
          },
          headerTintColor: isDark ? "#FFFFFF" : "#000000",
          headerTitleStyle: {
            fontWeight: "600",
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/profiles/new")}
              activeOpacity={0.7}
              style={{
                width: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="add-circle"
                size={28}
                color={isDark ? "#60A5FA" : "#3B82F6"}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconContainer,
                {
                  backgroundColor: isDark
                    ? "rgba(59, 130, 246, 0.1)"
                    : "rgba(59, 130, 246, 0.05)",
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={40}
                color={isDark ? "#60A5FA" : "#3B82F6"}
              />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: isDark ? "#F9FAFB" : "#111827" },
              ]}
            >
              No Profiles
            </Text>
            <Text
              style={[
                styles.emptyDescription,
                { color: isDark ? "#9CA3AF" : "#6B7280" },
              ]}
            >
              Create your first profile to organize your expenses
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/profiles/new")}
              activeOpacity={0.8}
              style={styles.createButton}
            >
              <Text style={styles.createButtonText}>Create Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profilesContainer}>
            {profiles.map((profile) => {
              const isActive = profile.id === currentProfileId;
              const gradientColors = getGradientColors(profile.color, isDark);

              return (
                <TouchableOpacity
                  key={profile.id}
                  activeOpacity={0.7}
                  onPress={() => !isActive && handleSwitchProfile(profile.id)}
                  style={styles.profileCard}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeCard}
                    >
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <View style={styles.iconContainer}>
                            {profile.icon ? (
                              <Text style={styles.iconEmoji}>
                                {profile.icon}
                              </Text>
                            ) : (
                              <Ionicons
                                name="person"
                                size={24}
                                color="#FFFFFF"
                              />
                            )}
                          </View>
                          <View style={styles.profileInfo}>
                            <View style={styles.nameRow}>
                              <Text style={styles.activeName}>
                                {profile.name}
                              </Text>
                              <View style={styles.activeBadge}>
                                <Text style={styles.activeBadgeText}>
                                  Active
                                </Text>
                              </View>
                            </View>
                            {profile.description && (
                              <Text
                                style={styles.activeDescription}
                                numberOfLines={1}
                              >
                                {profile.description}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(`/profiles/${profile.id}`);
                            }}
                            style={styles.actionButton}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="create-outline"
                              size={18}
                              color="#FFFFFF"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteProfile(profile);
                            }}
                            style={styles.actionButton}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#FFFFFF"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.inactiveCard,
                        {
                          backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                        },
                      ]}
                    >
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <View
                            style={[
                              styles.iconContainer,
                              styles.inactiveIconContainer,
                              {
                                backgroundColor: profile.color
                                  ? `${profile.color}15`
                                  : isDark
                                  ? "rgba(156, 163, 175, 0.1)"
                                  : "#E5E7EB",
                              },
                            ]}
                          >
                            {profile.icon ? (
                              <Text style={styles.iconEmoji}>
                                {profile.icon}
                              </Text>
                            ) : (
                              <Ionicons
                                name="person"
                                size={24}
                                color={isDark ? "#9CA3AF" : "#6B7280"}
                              />
                            )}
                          </View>
                          <View style={styles.profileInfo}>
                            <Text
                              style={[
                                styles.inactiveName,
                                { color: isDark ? "#F9FAFB" : "#111827" },
                              ]}
                            >
                              {profile.name}
                            </Text>
                            {profile.description && (
                              <Text
                                style={[
                                  styles.inactiveDescription,
                                  { color: isDark ? "#9CA3AF" : "#6B7280" },
                                ]}
                                numberOfLines={1}
                              >
                                {profile.description}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleSwitchProfile(profile.id);
                            }}
                            style={[
                              styles.switchButton,
                              {
                                backgroundColor: isDark
                                  ? "rgba(59, 130, 246, 0.2)"
                                  : "rgba(59, 130, 246, 0.1)",
                              },
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.switchButtonText,
                                { color: isDark ? "#60A5FA" : "#3B82F6" },
                              ]}
                            >
                              Switch
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(`/profiles/${profile.id}`);
                            }}
                            style={[
                              styles.actionButton,
                              styles.inactiveActionButton,
                              {
                                backgroundColor: isDark ? "#374151" : "#F3F4F6",
                              },
                            ]}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="create-outline"
                              size={18}
                              color={isDark ? "#9CA3AF" : "#6B7280"}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteProfile(profile);
                            }}
                            style={[
                              styles.actionButton,
                              styles.inactiveActionButton,
                              {
                                backgroundColor: isDark
                                  ? "rgba(239, 68, 68, 0.2)"
                                  : "#FEE2E2",
                              },
                            ]}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
    minHeight: "100%",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 280,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  profilesContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileCard: {
    marginBottom: 12,
  },
  activeCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  inactiveCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  inactiveIconContainer: {
    backgroundColor: "#E5E7EB",
  },
  iconEmoji: {
    fontSize: 24,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  activeName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 8,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  activeDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  inactiveName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  inactiveDescription: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  inactiveActionButton: {
    backgroundColor: "#F3F4F6",
  },
  switchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: "auto",
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
