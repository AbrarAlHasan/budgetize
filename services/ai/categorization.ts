import { isAiModelReady, categorizeWithLlm } from './ai-service';
import type { CategorySuggestion } from './types';

export async function suggestCategory(
  text: string,
  categories: Array<{ id: number; name: string }>
): Promise<CategorySuggestion | null> {
  if (!text.trim() || categories.length === 0) {
    return null;
  }

  const ready = await isAiModelReady();
  if (!ready) {
    return null;
  }

  const llmSuggestion = await categorizeWithLlm(text, categories);
  if (!llmSuggestion) {
    return null;
  }

  const category = categories.find((c) => c.id === llmSuggestion.categoryId);
  if (!category) {
    return null;
  }

  return {
    categoryId: llmSuggestion.categoryId,
    categoryName: category.name,
    confidence: llmSuggestion.confidence,
  };
}

export async function suggestCategoriesForImport(
  items: Array<{ id: string; narration: string; note: string }>,
  categories: Array<{ id: number; name: string }>
): Promise<Map<string, CategorySuggestion>> {
  const results = new Map<string, CategorySuggestion>();
  const ready = await isAiModelReady();

  if (!ready) {
    return results;
  }

  for (const item of items) {
    const text = item.note || item.narration;
    const suggestion = await suggestCategory(text, categories);
    if (suggestion) {
      results.set(item.id, suggestion);
    }
  }

  return results;
}
