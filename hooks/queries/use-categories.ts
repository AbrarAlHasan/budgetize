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
      const startTime = Date.now();
      console.log('[Performance] useCategories query started');
      
      const categories = await categoryRepository.findAll();
      const result = await categoryRepository.decryptCategories(categories);
      
      const endTime = Date.now();
      console.log(`[Performance] useCategories query completed in ${endTime - startTime}ms (${result.length} categories)`);
      
      return result;
    },
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const startTime = Date.now();
      console.log(`[Performance] useCategory(${id}) query started`);
      
      const category = await categoryRepository.findById(id);
      if (!category) {
        const endTime = Date.now();
        console.log(`[Performance] useCategory(${id}) query completed in ${endTime - startTime}ms (not found)`);
        return null;
      }
      const result = await categoryRepository.decryptCategory(category);
      
      const endTime = Date.now();
      console.log(`[Performance] useCategory(${id}) query completed in ${endTime - startTime}ms`);
      
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

