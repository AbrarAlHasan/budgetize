import { CreateCategoryInput, UpdateCategoryInput } from '@/db/schema/types';
import { categoryRepository } from '@/repositories/category.repository';
import { useProfileStore } from '@/store/profile-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { logPerformance } from '@/utils/logger';

const getProfileId = () => useProfileStore.getState().activeProfileId;

const QUERY_KEYS = {
  all: ['categories'] as const,
  lists: () => [...QUERY_KEYS.all, 'list', getProfileId()] as const,
  details: () => [...QUERY_KEYS.all, 'detail', getProfileId()] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.lists(),
    queryFn: async () => {
      const startTime = Date.now();
      
      const categories = await categoryRepository.findAll();
      const result = await categoryRepository.decryptCategories(categories);
      
      const endTime = Date.now();
      logPerformance('useCategories_query', endTime - startTime, `${result.length} categories`);
      
      return result;
    },
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const startTime = Date.now();
      
      const category = await categoryRepository.findById(id);
      if (!category) {
        const endTime = Date.now();
        logPerformance('useCategory_query', endTime - startTime, 'not found');
        return null;
      }
      const result = await categoryRepository.decryptCategory(category);
      
      const endTime = Date.now();
      logPerformance('useCategory_query', endTime - startTime);
      
      return result;
    },
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => categoryRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => categoryRepository.update(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => categoryRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

