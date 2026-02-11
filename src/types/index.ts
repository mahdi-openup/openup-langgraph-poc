// src/types/index.ts
// Extensible Type System for Multiple Message Types

import type { BaseMessage } from '@langchain/core/messages';

// Export helpers and configuration
export * from './schemas.js';
export * from './helpers.js';
export * from './messageConfig.js';

// ============================================
// MESSAGE TYPES - Extensible Union
// ============================================

export type MessageType =
  | 'text'                    // Default text response
  | 'emergency'               // Crisis response with resources
  | 'expert_profiles'         // Expert cards for selection
  | 'expert_availability'     // Time slot selection
  | 'session_booked'          // Booking confirmation
  | 'content_recommendations'; // Articles/videos list

// ============================================
// PAYLOAD TYPES - Data for each message type
// ============================================

// Emergency
export interface CrisisResource {
  name: string;
  number: string;
  label: string;
  country?: string;
}

export interface EmergencyPayload {
  severity: 'high' | 'medium';
  resources: CrisisResource[];
  safetyQuestion?: string;
}

// Expert Profile
export interface Expert {
  id: string;
  name: string;
  title: string;
  specializations: string[];
  languages: string[];
  imageUrl?: string;
  rating?: number;
  bio?: string;
}

export interface ExpertProfilesPayload {
  experts: Expert[];
  searchCriteria?: {
    sessionType: SessionType;
    topic?: string;
  };
}

// Expert Availability
export interface TimeSlot {
  id: string;
  expertId: string;
  startTime: string;  // ISO datetime
  endTime: string;
  available: boolean;
}

export interface ExpertAvailabilityPayload {
  expert: Expert;
  slots: TimeSlot[];
  timezone: string;
}

// Session Booked
export interface BookedSession {
  sessionId: string;
  expert: Expert;
  slot: TimeSlot;
  sessionType: SessionType;
  meetingUrl?: string;
  calendarLink?: string;
}

export interface SessionBookedPayload {
  session: BookedSession;
  confirmationMessage: string;
}

// Content Recommendations
export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  type: 'articles' | 'videos';  // Matches Azure index values (plural)
  topic: string;
  duration?: string;
  thumbnailUrl?: string;
  url: string;
  language: string;
}

export interface ContentRecommendationsPayload {
  items: ContentItem[];
  topic: string;
  totalCount?: number;
}

// ============================================
// MESSAGE PAYLOAD MAP - Type-safe mapping
// ============================================

export interface MessagePayloadMap {
  text: null;
  emergency: EmergencyPayload;
  expert_profiles: ExpertProfilesPayload;
  expert_availability: ExpertAvailabilityPayload;
  session_booked: SessionBookedPayload;
  content_recommendations: ContentRecommendationsPayload;
}

// ============================================
// STRUCTURED MESSAGE - Generic typed message
// ============================================

export interface StructuredMessage<T extends MessageType = MessageType> {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: T;
  content: string;  // Always have text content
  payload: MessagePayloadMap[T];
  timestamp: number;
}

// Helper type for creating messages
export type TextMessage = StructuredMessage<'text'>;
export type EmergencyMessage = StructuredMessage<'emergency'>;
export type ExpertProfilesMessage = StructuredMessage<'expert_profiles'>;
export type ExpertAvailabilityMessage = StructuredMessage<'expert_availability'>;
export type SessionBookedMessage = StructuredMessage<'session_booked'>;
export type ContentRecommendationsMessage = StructuredMessage<'content_recommendations'>;

// ============================================
// INTENT & SESSION TYPES
// ============================================

export type UserIntent =
  | 'ContentRecommendation'
  | 'BookSession'
  | 'SelectExpert'
  | 'SelectTimeSlot'
  | 'ConfirmBooking'
  | 'ClarificationNeeded'
  | 'OffScope';

export type SessionType = 'general' | 'physical-wellbeing';

// ============================================
// GRAPH STATE TYPES
// ============================================

export interface ConversationState {
  // Current flow
  intent: UserIntent | null;
  sessionType: SessionType | null;

  // Selected items (for multi-step flows)
  selectedExpertId: string | null;
  selectedSlotId: string | null;

  // Search context
  contentTopic: string | null;
  conversationSummary: string | null;

  // Results cache
  experts: Expert[];
  timeSlots: TimeSlot[];
  contentItems: ContentItem[];

  // Emergency
  isEmergency: boolean;
}

// ============================================
// TOOL RESULT TYPE - What tools return
// ============================================

export interface ToolResult<T extends MessageType = MessageType> {
  messageType: T;
  payload: MessagePayloadMap[T];
  textContent: string;  // Conversational text to accompany the data
}

// ============================================
// CHAT API TYPES
// ============================================

export interface ChatOptions {
  conversationLanguage?: string;
  conversationId?: string;
  conversationHistory?: BaseMessage[];
}

export interface ChatResponse {
  message: string;
  messageType: MessageType;
  payload: MessagePayloadMap[MessageType] | null;
  isEmergency: boolean;
  state?: Partial<ConversationState>;
}

// Circuit Breaker Configuration
export interface CircuitBreakerConfig {
  emergencyTimeoutMs: number;
}
