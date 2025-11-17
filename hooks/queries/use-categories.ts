import { useQuery } from '@tanstack/react-query';
import { categoryRepository } from '@/repositories/category.repository';

const QUERY_KEYS = {
  all: ['categories'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
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

