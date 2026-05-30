import { CloudAiNotConfiguredError } from '@/services/ai/providers/cloud-provider';
import { queryExecutor } from '@/services/query-executor';

import {
  formatEntityContextForPrompt,
  loadAiEntityContext,
} from './ai-context-loader';
import {
  chatConversationally,
  formatAnswerWithLlm,
  generateSqlWithLlm,
  isAiModelReady,
} from './ai-service';
import { humanizeSqlError, isSkipSqlQuery } from './sql-validation';
import type { AiAssistantResponse, AiChatHistoryMessage } from './types';

export class AiModelNotReadyError extends Error {
  constructor() {
    super('Download the on-device AI model to use Ask Budgetize.');
    this.name = 'AiModelNotReadyError';
  }
}

export async function answerBudgetizeQuestion(
  question: string,
  currencyCode: string,
  history: AiChatHistoryMessage[] = []
): Promise<AiAssistantResponse> {
  const ready = await isAiModelReady();
  if (!ready) {
    throw new AiModelNotReadyError();
  }

  const entityContext = await loadAiEntityContext();
  const entityContextText = formatEntityContextForPrompt(entityContext);

  const sql = await generateSqlWithLlm(question, entityContextText);

  if (!sql || isSkipSqlQuery(sql)) {
    const chatAnswer = await chatConversationally(question, history, currencyCode);
    return {
      success: true,
      message: chatAnswer ?? 'I had trouble responding. Please try again.',
    };
  }

  const queryResult = await queryExecutor.executeQuery(sql);

  if (!queryResult.success) {
    const errorMessage = humanizeSqlError(queryResult.error ?? 'Query failed');
    const chatAnswer = await formatAnswerWithLlm(question, [], currencyCode);
    return {
      success: true,
      message: chatAnswer ?? errorMessage,
    };
  }

  const rows = (queryResult.data ?? []) as Record<string, unknown>[];
  const answer = await formatAnswerWithLlm(question, rows, currencyCode);

  return {
    success: true,
    message:
      answer ??
      'I retrieved your data but could not format an answer. Please try again.',
  };
}

export function formatAiError(error: unknown): AiAssistantResponse {
  if (error instanceof AiModelNotReadyError) {
    return { success: false, message: error.message };
  }

  if (error instanceof CloudAiNotConfiguredError) {
    return { success: false, message: error.message };
  }

  if (error instanceof Error) {
    return { success: false, message: humanizeSqlError(error.message) };
  }

  return {
    success: false,
    message: 'Something went wrong. Please try again.',
  };
}
