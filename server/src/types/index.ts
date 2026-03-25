export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
}

export interface APIError {
  error: string;
}
