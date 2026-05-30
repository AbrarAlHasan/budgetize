export interface AiChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiAssistantResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidence: number;
}

export interface AiInsight {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'positive';
  source: 'velocity' | 'comparison' | 'exchange' | 'anomaly';
}
