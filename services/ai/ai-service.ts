import { format } from 'date-fns';
import { Platform } from 'react-native';

import { logError } from '@/utils/logger';

import {
  getActiveInferenceProvider,
  reloadInferenceProvider,
} from './providers/inference-router';
import type { AiCompletionMessage } from './providers/types';
import {
  buildAnswerPrompt,
  buildChatSystemPrompt,
  buildCategorizeSystemPrompt,
  buildInsightsPrompt,
  buildSqlGenerationPrompt,
} from './prompts';
import { validateGeneratedSql } from './sql-validation';
import { useSettingsStore } from '@/store/settings-store';

export async function releaseAiContext(): Promise<void> {
  await reloadInferenceProvider();
}

export async function isAiModelReady(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const provider = getActiveInferenceProvider();
  const { settings } = useSettingsStore.getState();

  if (settings.aiExecutionMode === 'cloud') {
    return provider.isRuntimeAvailable();
  }

  if (!provider.isLoaded()) {
    return false;
  }

  const runtimeAvailable = await provider.isRuntimeAvailable();
  return runtimeAvailable;
}

export async function isModelDownloadedForSettings(): Promise<boolean> {
  const { settings } = useSettingsStore.getState();

  if (settings.aiExecutionMode === 'cloud') {
    return false;
  }

  return settings.aiDownloadedModelId === settings.aiOnDeviceModelId;
}

const MAX_RESULT_ROWS = 200;
const MAX_RESULT_JSON_CHARS = 6000;

export function extractSqlFromLlmOutput(text: string): string | null {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (codeBlock?.[1]) {
    return sanitizeGeneratedSql(codeBlock[1]);
  }

  const selectMatch = trimmed.match(/(SELECT[\s\S]+?)(;?\s*$)/i);
  if (selectMatch?.[1]) {
    return sanitizeGeneratedSql(selectMatch[1]);
  }

  if (trimmed.toUpperCase().startsWith('SELECT')) {
    return sanitizeGeneratedSql(trimmed);
  }

  return null;
}

function sanitizeGeneratedSql(sql: string): string {
  let cleaned = sql.trim().replace(/;+\s*$/, '');
  if (!/\bLIMIT\s+\d+/i.test(cleaned)) {
    cleaned = `${cleaned} LIMIT ${MAX_RESULT_ROWS}`;
  }
  return cleaned;
}

function truncateResultsForPrompt(data: Record<string, unknown>[]): string {
  let limited = data.slice(0, MAX_RESULT_ROWS);
  while (limited.length > 1 && JSON.stringify(limited).length > MAX_RESULT_JSON_CHARS) {
    limited = limited.slice(0, Math.floor(limited.length / 2));
  }
  return JSON.stringify(limited);
}

async function runLlmCompletion(
  messages: AiCompletionMessage[],
  temperature: number
): Promise<string | null> {
  const provider = getActiveInferenceProvider();

  try {
    const runtimeAvailable = await provider.isRuntimeAvailable();
    if (!runtimeAvailable) {
      return null;
    }

    return await provider.complete(messages, { temperature });
  } catch (error) {
    logError('LLM completion failed:', error);
    return null;
  }
}

import type { AiChatHistoryMessage } from './types';

const MAX_CHAT_HISTORY = 10;

export async function chatConversationally(
  question: string,
  history: AiChatHistoryMessage[],
  currencyCode: string
): Promise<string | null> {
  const systemPrompt = buildChatSystemPrompt(currencyCode);
  const recentHistory = history.slice(-MAX_CHAT_HISTORY);

  const messages: AiCompletionMessage[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.map((entry) => ({
      role: entry.role,
      content: entry.content,
    })),
    { role: 'user', content: question },
  ];

  return runLlmCompletion(messages, 0.45);
}

export async function generateSqlWithLlm(
  question: string,
  entityContextText: string
): Promise<string | null> {
  const currentDate = format(new Date(), 'yyyy-MM-dd');
  const systemPrompt = buildSqlGenerationPrompt(currentDate, entityContextText);

  const result = await runLlmCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    0.05
  );

  if (!result) return null;

  const sql = extractSqlFromLlmOutput(result);
  if (!sql) return null;

  const validation = validateGeneratedSql(sql);
  if (!validation.valid) {
    logError('Generated SQL failed validation:', validation.error, sql);
    return null;
  }

  return sql;
}

export async function formatAnswerWithLlm(
  question: string,
  data: Record<string, unknown>[],
  currencyCode: string
): Promise<string | null> {
  const resultsJson = truncateResultsForPrompt(data);
  const systemPrompt = buildAnswerPrompt(question, resultsJson, currencyCode);

  return runLlmCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    0.2
  );
}

export async function generateInsightsWithLlm(
  metricsJson: string,
  currencyCode: string
): Promise<string | null> {
  const systemPrompt = buildInsightsPrompt(metricsJson, currencyCode);

  const text = await runLlmCompletion(
    [{ role: 'system', content: systemPrompt }],
    0.2
  );

  if (!text) return null;

  const trimmed = text.trim();
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  return arrayMatch ? arrayMatch[0] : trimmed.startsWith('[') ? trimmed : '[]';
}

export async function categorizeWithLlm(
  note: string,
  categories: Array<{ id: number; name: string }>
): Promise<{ categoryId: number; confidence: number } | null> {
  if (!note.trim() || categories.length === 0) {
    return null;
  }

  const systemPrompt = buildCategorizeSystemPrompt(categories);

  const result = await runLlmCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: note.trim() },
    ],
    0.1
  );

  if (!result) return null;

  const text = result.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      categoryId?: number;
      confidence?: number;
    };

    if (typeof parsed.categoryId !== 'number') return null;

    const validCategory = categories.some((c) => c.id === parsed.categoryId);
    if (!validCategory) return null;

    return {
      categoryId: parsed.categoryId,
      confidence:
        typeof parsed.confidence === 'number'
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.7,
    };
  } catch {
    return null;
  }
}
