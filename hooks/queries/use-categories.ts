import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryRepository } from '@/repositories/category.repository';
import { CreateCategoryInput, UpdateCategoryInput } from '@/db/schema/types';

const QUERY_KEYS = {
  all: ['categories'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.lists(),
    queryFn: async () => {
      const categories = await categoryRepository.findAll();
      return categoryRepository.decryptCategories(categories);
    },
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const category = await categoryRepository.findById(id);
      if (!category) return null;
      return categoryRepository.decryptCategory(category);
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

