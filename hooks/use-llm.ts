/**
 * Hook for using on-device LLM with react-native-executorch
 */
import { useLLM, LLAMA3_2_1B, Message } from 'react-native-executorch';
import { useEffect, useState, useCallback } from 'react';
import { logError } from '@/utils/logger';

export function useOnDeviceLLM() {
  const llm = useLLM({ model: LLAMA3_2_1B });
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Model is ready when it's not generating and has been initialized
    // The model might take some time to load initially
    if (llm && typeof llm.generate === 'function') {
      setIsReady(true);
    }
  }, [llm]);

  const generate = useCallback(async (messages: Message[]): Promise<string> => {
    if (!llm || typeof llm.generate !== 'function') {
      throw new Error('LLM is not ready yet');
    }

    try {
      setIsGenerating(true);
      await llm.generate(messages);
      return llm.response || '';
    } catch (error) {
      logError('LLM generation error:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [llm]);

  return {
    generate,
    isReady,
    isGenerating: isGenerating || llm.isGenerating,
    response: llm.response,
  };
}

