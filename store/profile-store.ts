import { log, logError } from "@/utils/logger";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { persistentStorage } from "@/storage/mmkv";
import { profileRepository, Profile } from "@/repositories/profile.repository";
import { useQueryClient } from "@tanstack/react-query";

const PROFILE_STORE_KEY = "profile_store";

interface ProfileStore {
  activeProfileId: number | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  setActiveProfile: (profileId: number) => Promise<void>;
  createProfile: (name: string, isDefault?: boolean) => Promise<Profile>;
  updateProfile: (id: number, name: string) => Promise<Profile>;
  deleteProfile: (id: number) => Promise<void>;
  setDefaultProfile: (id: number) => Promise<void>;
  refreshProfiles: () => Promise<void>;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      activeProfileId: null,
      isLoading: false,
      isInitialized: false,

      /**
       * Initialize the profile store
       * - If no active profile, get or create default profile
       * - Set active profile
       */
      initialize: async () => {
        if (get().isInitialized) {
          return;
        }

        set({ isLoading: true });

        try {
          let activeProfileId = get().activeProfileId;

          // If no active profile, get default profile
          if (!activeProfileId) {
            const defaultProfile = await profileRepository.findDefault();
            
            if (!defaultProfile) {
              // No default profile exists, create one
              const newProfile = await profileRepository.create({
                name: "Personal",
                is_default: true,
              });
              activeProfileId = newProfile.id;
              log("Created default profile:", newProfile.id);
            } else {
              activeProfileId = defaultProfile.id;
              log("Using existing default profile:", activeProfileId);
            }
          }

          // Verify profile still exists
          const profile = await profileRepository.findById(activeProfileId);
          if (!profile) {
            // Profile was deleted, get default
            const defaultProfile = await profileRepository.findDefault();
            if (defaultProfile) {
              activeProfileId = defaultProfile.id;
            } else {
              // Create new default
              const newProfile = await profileRepository.create({
                name: "Personal",
                is_default: true,
              });
              activeProfileId = newProfile.id;
            }
          }

          set({
            activeProfileId,
            isInitialized: true,
            isLoading: false,
          });

          log("Profile store initialized with profile:", activeProfileId);
        } catch (error) {
          logError("Error initializing profile store:", error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      /**
       * Set the active profile
       * This will clear all React Query cache and reload data
       */
      setActiveProfile: async (profileId: number) => {
        try {
          // Verify profile exists
          const profile = await profileRepository.findById(profileId);
          if (!profile) {
            throw new Error("Profile not found");
          }

          set({ activeProfileId: profileId });
          log("Active profile set to:", profileId);

          // Note: React Query cache invalidation should be handled
          // by the component that calls this, using useQueryClient
        } catch (error) {
          logError("Error setting active profile:", error);
          throw error;
        }
      },

      /**
       * Create a new profile
       */
      createProfile: async (name: string, isDefault = false) => {
        try {
          const profile = await profileRepository.create({
            name,
            is_default: isDefault,
          });

          // If this is the first profile or is set as default, make it active
          if (isDefault || !get().activeProfileId) {
            await get().setActiveProfile(profile.id);
          }

          return profile;
        } catch (error) {
          logError("Error creating profile:", error);
          throw error;
        }
      },

      /**
       * Update a profile name
       */
      updateProfile: async (id: number, name: string) => {
        try {
          return await profileRepository.update({ id, name });
        } catch (error) {
          logError("Error updating profile:", error);
          throw error;
        }
      },

      /**
       * Delete a profile and all its data
       */
      deleteProfile: async (id: number) => {
        try {
          await profileRepository.delete(id);

          // If we deleted the active profile, switch to default
          if (get().activeProfileId === id) {
            const defaultProfile = await profileRepository.findDefault();
            if (defaultProfile) {
              await get().setActiveProfile(defaultProfile.id);
            }
          }
        } catch (error) {
          logError("Error deleting profile:", error);
          throw error;
        }
      },

      /**
       * Set a profile as default
       */
      setDefaultProfile: async (id: number) => {
        try {
          await profileRepository.setDefault(id);
        } catch (error) {
          logError("Error setting default profile:", error);
          throw error;
        }
      },

      /**
       * Refresh profiles list (for UI updates)
       */
      refreshProfiles: async () => {
        // This is a no-op for now, but can be used to trigger UI refreshes
        // The actual profile list is fetched via React Query hooks
      },
    }),
    {
      name: PROFILE_STORE_KEY,
      storage: createJSONStorage(() => persistentStorage),
    }
  )
);

/**
 * Hook to get the active profile ID
 * This should be used throughout the app to get the current profile
 */
export function useActiveProfileId(): number {
  const activeProfileId = useProfileStore((state) => state.activeProfileId);
  
  if (!activeProfileId) {
    throw new Error("Active profile ID is not set. Call initialize() first.");
  }
  
  return activeProfileId;
}

