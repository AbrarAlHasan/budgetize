import { useProfiles, useSwitchProfile } from "@/hooks/queries/use-profiles";
import { useProfileStore } from "@/store/profile-store";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { useState } from "react";

interface ProfileSwitcherProps {
  children: React.ReactNode;
}

export function ProfileSwitcher({ children }: ProfileSwitcherProps) {
  const { data: profiles, isLoading } = useProfiles();
  const activeProfileId = useProfileStore((state) => state.activeProfileId);
  const switchProfile = useSwitchProfile();
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitchProfile = async (profileId: number) => {
    if (profileId === activeProfileId) {
      setIsOpen(false);
      return;
    }

    try {
      await switchProfile.mutateAsync(profileId);
      setIsOpen(false);
    } catch (error) {
      console.error("Error switching profile:", error);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const activeProfile = profiles?.find((p) => p.id === activeProfileId);

  return (
    <>
      <Pressable onPress={() => setIsOpen(true)}>
        <ThemedView style={styles.profileButton}>
          <ThemedText style={styles.profileButtonText}>
            {activeProfile?.name || "Select Profile"}
          </ThemedText>
        </ThemedView>
      </Pressable>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        snapPoints={["50%"]}
      >
        <ThemedView style={styles.sheetContent}>
          <ThemedText style={styles.sheetTitle}>Switch Profile</ThemedText>
          
          {profiles?.map((profile) => (
            <Pressable
              key={profile.id}
              onPress={() => handleSwitchProfile(profile.id)}
              style={[
                styles.profileItem,
                profile.id === activeProfileId && styles.activeProfileItem,
              ]}
            >
              <ThemedText
                style={[
                  styles.profileItemText,
                  profile.id === activeProfileId && styles.activeProfileItemText,
                ]}
              >
                {profile.name}
                {profile.is_default === 1 && " (Default)"}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      </BottomSheet>

      {children}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sheetContent: {
    padding: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  profileItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  activeProfileItem: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  profileItemText: {
    fontSize: 16,
  },
  activeProfileItemText: {
    fontWeight: "600",
    color: "#007AFF",
  },
});

