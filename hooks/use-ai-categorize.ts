import { useCallback, useRef, useState } from 'react';

import { suggestCategory as suggestCategoryWithAi } from '@/services/ai/categorization';
import type { CategorySuggestion } from '@/services/ai/types';
import { useSettingsStore } from '@/store/settings-store';

interface UseAiCategorizeOptions {
  categories: Array<{ id: number; name: string }>;
  debounceMs?: number;
  minConfidence?: number;
}

export function useAiCategorize({
  categories,
  debounceMs = 600,
  minConfidence = 0.5,
}: UseAiCategorizeOptions) {
  const { settings } = useSettingsStore();
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNoteRef = useRef<string>('');

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  const suggestCategory = useCallback(
    (note: string) => {
      lastNoteRef.current = note;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!settings.aiEnabled || !note.trim() || categories.length === 0) {
        setSuggestion(null);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        const noteToProcess = lastNoteRef.current;
        if (!noteToProcess.trim()) {
          setSuggestion(null);
          return;
        }

        setIsSuggesting(true);
        try {
          const result = await suggestCategoryWithAi(noteToProcess, categories);
          if (!result || result.confidence < minConfidence) {
            setSuggestion(null);
            return;
          }

          if (noteToProcess === lastNoteRef.current) {
            setSuggestion(result);
          }
        } finally {
          setIsSuggesting(false);
        }
      }, debounceMs);
    },
    [categories, debounceMs, minConfidence, settings.aiEnabled]
  );

  return {
    suggestion,
    isSuggesting,
    suggestCategory,
    clearSuggestion,
  };
}
