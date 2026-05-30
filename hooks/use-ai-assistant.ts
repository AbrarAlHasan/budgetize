import { useCallback, useState } from 'react';

import {
  answerBudgetizeQuestion,
  formatAiError,
} from '@/services/ai/ai-assistant-service';
import type { AiAssistantResponse, AiChatHistoryMessage } from '@/services/ai/types';
import { useSettingsStore } from '@/store/settings-store';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  success?: boolean;
}

interface UseAiAssistantOptions {
  isModelReady: boolean;
}

const WELCOME_READY =
  "Hi! I'm your Budgetize assistant. Ask me anything about your spending, income, categories, accounts, or tags — I'll look up your data and answer naturally.";

const WELCOME_NOT_READY =
  'Download the on-device AI model above to start chatting about your finances.';

function toChatHistory(messages: ChatMessage[]): AiChatHistoryMessage[] {
  return messages
    .filter((message) => message.id !== 'welcome')
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export function useAiAssistant({ isModelReady }: UseAiAssistantOptions) {
  const { settings } = useSettingsStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_READY,
      timestamp: new Date(),
      success: true,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const askQuestion = useCallback(
    async (question: string): Promise<AiAssistantResponse> => {
      const trimmed = question.trim();
      if (!trimmed) {
        return { success: false, message: 'Please enter a message.' };
      }

      if (!isModelReady) {
        return {
          success: false,
          message:
            'Download and load the on-device AI model using the banner above before chatting.',
        };
      }

      const history = toChatHistory(messages);

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await answerBudgetizeQuestion(
          trimmed,
          settings.currency,
          history
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            success: response.success,
          },
        ]);

        return response;
      } catch (error) {
        const errorResponse = formatAiError(error);

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: errorResponse.message,
            timestamp: new Date(),
            success: false,
          },
        ]);

        return errorResponse;
      } finally {
        setIsLoading(false);
      }
    },
    [isModelReady, messages, settings.currency]
  );

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: isModelReady ? WELCOME_READY : WELCOME_NOT_READY,
        timestamp: new Date(),
        success: true,
      },
    ]);
  }, [isModelReady]);

  return {
    messages,
    isLoading,
    askQuestion,
    clearMessages,
  };
}
