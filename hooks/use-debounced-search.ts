import { useCallback, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const DEFAULT_DEBOUNCE_MS = 400;

export interface UseDebouncedSearchResult {
  /** Immediate input value (bind to TextInput). */
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  /** Trimmed value used for API / SQL queries (debounced). */
  debouncedQuery: string;
  /** True while the user is typing and debounce has not settled. */
  isDebouncing: boolean;
}

export function useDebouncedSearch(
  delayMs: number = DEFAULT_DEBOUNCE_MS
): UseDebouncedSearchResult {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, delayMs);

  const isDebouncing = trimmedQuery !== debouncedQuery;

  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);

  return useMemo(
    () => ({
      query,
      setQuery,
      clearQuery,
      debouncedQuery,
      isDebouncing,
    }),
    [query, setQuery, clearQuery, debouncedQuery, isDebouncing]
  );
}
