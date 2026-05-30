export type AiExecutionMode = 'on_device' | 'cloud';

export type AiCompletionRole = 'system' | 'user' | 'assistant';

export interface AiCompletionMessage {
  role: AiCompletionRole;
  content: string;
}

export interface AiCompletionOptions {
  temperature?: number;
}

export interface AiInferenceProvider {
  readonly mode: AiExecutionMode;
  isRuntimeAvailable(): Promise<boolean>;
  isLoaded(): boolean;
  load(options?: {
    allowCellular?: boolean;
    onProgress?: (progress: number) => void;
  }): Promise<void>;
  unload(): Promise<void>;
  complete(
    messages: AiCompletionMessage[],
    options?: AiCompletionOptions
  ): Promise<string | null>;
}
