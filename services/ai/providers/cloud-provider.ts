import type {
  AiCompletionMessage,
  AiCompletionOptions,
  AiInferenceProvider,
} from './types';

export class CloudAiNotConfiguredError extends Error {
  constructor() {
    super(
      'Cloud AI is not available yet. Switch to on-device AI in Settings, or check back for cloud model support.'
    );
    this.name = 'CloudAiNotConfiguredError';
  }
}

class CloudAiProvider implements AiInferenceProvider {
  readonly mode = 'cloud' as const;

  async isRuntimeAvailable(): Promise<boolean> {
    return false;
  }

  isLoaded(): boolean {
    return false;
  }

  async load(): Promise<void> {
    throw new CloudAiNotConfiguredError();
  }

  async unload(): Promise<void> {
    return;
  }

  async complete(
    _messages: AiCompletionMessage[],
    _options?: AiCompletionOptions
  ): Promise<string | null> {
    throw new CloudAiNotConfiguredError();
  }
}

export const cloudAiProvider = new CloudAiProvider();
