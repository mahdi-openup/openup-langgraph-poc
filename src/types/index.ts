import type { BaseMessage } from '@langchain/core/messages';

export type UserIntent =
  | 'ContentRecommendation'
  | 'BookSession'
  | 'ClarificationNeeded'
  | 'OffScope';

export type SessionType = 'general' | 'physical-wellbeing';
export type ContentType = 'article' | 'video';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  topic: string;
  url: string;
}

export interface Expert {
  id: string;
  name: string;
  specialization: string;
  languages: string[];
  availableSlots: string[];
}

export interface ChatResponse {
  message: string;
  isEmergency: boolean;
  metadata?: Record<string, unknown>;
}

export interface CircuitBreakerConfig {
  emergencyTimeoutMs: number;
}

export interface ChatOptions {
  conversationLanguage?: string;
  conversationId?: string;
  conversationHistory?: BaseMessage[];
}
