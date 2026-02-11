// src/graph/state.ts - Graph State Definition Only
import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type {
  MessageType,
  MessagePayloadMap,
  UserIntent,
  SessionType,
  Expert,
  TimeSlot,
  ContentItem,
} from '../types/index.js';

export const GraphState = Annotation.Root({
  // Messages (LangChain format)
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Conversation context
  conversationLanguage: Annotation<string>({
    reducer: (_, update) => update,
    default: () => 'en-GB',
  }),
  conversationId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  // Emergency
  isEmergency: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),

  // Current intent & session type
  intent: Annotation<UserIntent | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  sessionType: Annotation<SessionType | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Multi-step flow state
  selectedExpertId: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  selectedSlotId: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Search context
  contentTopic: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  contentLanguage: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  contentType: Annotation<'articles' | 'videos' | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  conversationSummary: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Results cache
  experts: Annotation<Expert[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  timeSlots: Annotation<TimeSlot[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  contentItems: Annotation<ContentItem[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // Response output
  responseMessage: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  responseMessageType: Annotation<MessageType>({
    reducer: (_, update) => update,
    default: () => 'text',
  }),
  responsePayload: Annotation<MessagePayloadMap[MessageType] | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Error
  error: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Agent completion tracking (for follow-up generation)
  agentCompleted: Annotation<'content' | 'booking' | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Follow-up question (rendered after content/results)
  followupQuestion: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});

export type GraphStateType = typeof GraphState.State;
