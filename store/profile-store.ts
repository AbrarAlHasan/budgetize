import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistentStorage } from '@/storage/mmkv';
import { logError } from '@/utils/logger';
import { profileRepository } from '@/repositories/profile.repository';
import { switchProfile as switchProfileDb, setActiveProfileId } from '@/db/sqlite/db';

export interface Profile {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  db_path: string;
  created_at: string;
  updated_at: string;
}

interface CreateProfileInput {
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

interface UpdateProfileInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

interface ProfileStore {
  currentProfileId: number | null;
  profiles: Profile[];
  isLoading: boolean;
  loadProfiles: () => Promise<void>;
  switchProfile: (profileId: number) => Promise<void>;
  createProfile: (input: CreateProfileInput) => Promise<Profile>;
  updateProfile: (id: number, input: UpdateProfileInput) => Promise<void>;
  deleteProfile: (id: number) => Promise<void>;
  findDefaultProfile: () => Profile | null;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      currentProfileId: null,
      profiles: [],
      isLoading: false,

      loadProfiles: async () => {
        const currentState = get();
        // Prevent multiple simultaneous loads
        if (currentState.isLoading) {
          return;
        }

        set({ isLoading: true });
        try {
          const profiles = await profileRepository.findAll();
          const { currentProfileId } = get();
          
          // Check if current profile still exists
          const currentProfileExists = currentProfileId && profiles.some((p) => p.id === currentProfileId);
          
          // If no current profile or current profile doesn't exist, set default
          if (!currentProfileExists && profiles.length > 0) {
            const defaultProfile = profiles.find((p) => p.name === 'Personal') || profiles[0];
            // Set the active profile ID in db.ts first
            setActiveProfileId(defaultProfile.id);
            // Then update the store
            set({ 
              profiles,
              currentProfileId: defaultProfile.id 
            });
            // Switch the database connection
            await switchProfileDb(defaultProfile.id);
          } else {
            // Just update profiles list, keep current profile
            set({ profiles });
            // Ensure db.ts has the correct active profile ID
            if (currentProfileId) {
              setActiveProfileId(currentProfileId);
            }
          }
        } catch (error) {
          logError('Error loading profiles:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      switchProfile: async (profileId: number) => {
        const { currentProfileId } = get();
        
        // If already on this profile, do nothing
        if (currentProfileId === profileId) {
          return;
        }

        try {
          // Set active profile ID in db.ts first
          setActiveProfileId(profileId);
          
          // Close old database and open new one
          await switchProfileDb(profileId);

          // Update current profile
          set({ currentProfileId: profileId });

          // Query invalidation will be handled by components that call switchProfile
          // They have access to queryClient via useQueryClient hook
        } catch (error) {
          logError('Error switching profile:', error);
          throw error;
        }
      },

      createProfile: async (input: CreateProfileInput) => {
        try {
          const profile = await profileRepository.create(input);
          const profiles = await profileRepository.findAll();
          set({ profiles });
          
          // Switch to newly created profile
          await get().switchProfile(profile.id);
          
          return profile;
        } catch (error) {
          logError('Error creating profile:', error);
          throw error;
        }
      },

      updateProfile: async (id: number, input: UpdateProfileInput) => {
        try {
          await profileRepository.update(id, input);
          const profiles = await profileRepository.findAll();
          set({ profiles });
        } catch (error) {
          logError('Error updating profile:', error);
          throw error;
        }
      },

      deleteProfile: async (id: number) => {
        try {
          const { currentProfileId, profiles } = get();
          
          // Delete profile and its database file
          await profileRepository.delete(id);
          
          // Reload profiles
          const updatedProfiles = await profileRepository.findAll();
          set({ profiles: updatedProfiles });

          // If deleted profile was active, switch to default
          if (currentProfileId === id) {
            if (updatedProfiles.length > 0) {
              const defaultProfile = updatedProfiles.find((p) => p.name === 'Personal') || updatedProfiles[0];
              await get().switchProfile(defaultProfile.id);
            } else {
              set({ currentProfileId: null });
            }
          }
        } catch (error) {
          logError('Error deleting profile:', error);
          throw error;
        }
      },

      findDefaultProfile: () => {
        const { profiles } = get();
        return profiles.find((p) => p.name === 'Personal') || profiles[0] || null;
      },
    }),
    {
      name: 'profile-store',
      storage: createJSONStorage(() => persistentStorage),
      partialize: (state) => ({
        currentProfileId: state.currentProfileId,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            logError('Error rehydrating profile store:', error);
            return;
          }
          // When storage is rehydrated, sync the active profile ID with db.ts
          // Use setTimeout to avoid calling setActiveProfileId during render
          if (state?.currentProfileId) {
            setTimeout(() => {
              setActiveProfileId(state.currentProfileId);
            }, 0);
          }
        };
      },
    }
  )
);

