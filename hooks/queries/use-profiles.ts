import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileRepository, Profile } from "@/repositories/profile.repository";
import { useProfileStore } from "@/store/profile-store";
import { logPerformance } from "@/utils/logger";

const QUERY_KEYS = {
  all: ["profiles"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  details: () => [...QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
  default: () => [...QUERY_KEYS.all, "default"] as const,
};

export function useProfiles() {
  return useQuery<Profile[]>({
    queryKey: QUERY_KEYS.lists(),
    queryFn: async () => {
      const startTime = Date.now();
      const profiles = await profileRepository.findAll();
      const endTime = Date.now();
      logPerformance("useProfiles_query", endTime - startTime, `${profiles.length} profiles`);
      return profiles;
    },
  });
}

export function useProfile(id: number) {
  return useQuery<Profile | null>({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      return await profileRepository.findById(id);
    },
  });
}

export function useDefaultProfile() {
  return useQuery<Profile | null>({
    queryKey: QUERY_KEYS.default(),
    queryFn: async () => {
      return await profileRepository.findDefault();
    },
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  const { createProfile } = useProfileStore();

  return useMutation({
    mutationFn: async (input: { name: string; isDefault?: boolean }) => {
      return await createProfile(input.name, input.isDefault);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateProfile } = useProfileStore();

  return useMutation({
    mutationFn: async (input: { id: number; name: string }) => {
      return await updateProfile(input.id, input.name);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.id) });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  const { deleteProfile } = useProfileStore();

  return useMutation({
    mutationFn: async (id: number) => {
      return await deleteProfile(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      // Invalidate all data queries since profile changed
      queryClient.invalidateQueries();
    },
  });
}

export function useSetDefaultProfile() {
  const queryClient = useQueryClient();
  const { setDefaultProfile } = useProfileStore();

  return useMutation({
    mutationFn: async (id: number) => {
      return await setDefaultProfile(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.default() });
    },
  });
}

export function useSwitchProfile() {
  const queryClient = useQueryClient();
  const { setActiveProfile } = useProfileStore();

  return useMutation({
    mutationFn: async (profileId: number) => {
      await setActiveProfile(profileId);
      return profileId;
    },
    onSuccess: () => {
      // Invalidate all queries to reload data for new profile
      queryClient.invalidateQueries();
    },
  });
}

