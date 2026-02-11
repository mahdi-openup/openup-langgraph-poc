// src/types/messageConfig.ts
// Metadata and configuration for each message type

import type { MessageType } from './index.js';

/**
 * Category classification for message types
 */
export type MessageCategory = 'content' | 'booking' | 'emergency' | 'system';

/**
 * Configuration metadata for a message type
 */
export interface MessageTypeConfig {
  /** Unique identifier matching MessageType */
  id: MessageType;

  /** Human-readable display name */
  displayName: string;

  /** Category for grouping and filtering */
  category: MessageCategory;

  /** Brief description of what this message type represents */
  description: string;

  /** Whether this message type requires user interaction/action */
  requiresUserAction?: boolean;

  /** Icon name (for frontend rendering) */
  icon?: string;

  /** Additional metadata for UI rendering hints */
  metadata?: Record<string, unknown>;
}

/**
 * Complete configuration map for all message types
 *
 * This serves as the single source of truth for message type metadata.
 * Frontend can fetch this via the /message-types API endpoint.
 */
export const MESSAGE_TYPE_CONFIG: Record<MessageType, MessageTypeConfig> = {
  text: {
    id: 'text',
    displayName: 'Text Message',
    category: 'system',
    description: 'Default conversational text response',
    icon: 'message-circle',
  },

  emergency: {
    id: 'emergency',
    displayName: 'Emergency Support',
    category: 'emergency',
    description: 'Crisis response with emergency resources and helplines',
    requiresUserAction: true,
    icon: 'alert-triangle',
    metadata: {
      priority: 'critical',
      color: 'red',
    },
  },

  expert_profiles: {
    id: 'expert_profiles',
    displayName: 'Expert Profiles',
    category: 'booking',
    description: 'Display expert cards for user selection',
    requiresUserAction: true,
    icon: 'users',
    metadata: {
      cardLayout: true,
    },
  },

  expert_availability: {
    id: 'expert_availability',
    displayName: 'Time Slot Picker',
    category: 'booking',
    description: 'Calendar view with available time slots for booking',
    requiresUserAction: true,
    icon: 'calendar',
    metadata: {
      calendarView: true,
    },
  },

  session_booked: {
    id: 'session_booked',
    displayName: 'Booking Confirmation',
    category: 'booking',
    description: 'Session booking confirmation with meeting details',
    icon: 'check-circle',
    metadata: {
      showCalendarButton: true,
      color: 'green',
    },
  },

  content_recommendations: {
    id: 'content_recommendations',
    displayName: 'Content Recommendations',
    category: 'content',
    description: 'Curated list of articles and videos',
    icon: 'book-open',
    metadata: {
      listLayout: true,
    },
  },
};

/**
 * Get configuration for a specific message type
 */
export function getMessageTypeConfig(messageType: MessageType): MessageTypeConfig {
  return MESSAGE_TYPE_CONFIG[messageType];
}

/**
 * Get all message types in a specific category
 */
export function getMessageTypesByCategory(category: MessageCategory): MessageTypeConfig[] {
  return Object.values(MESSAGE_TYPE_CONFIG).filter((config) => config.category === category);
}

/**
 * Get all message types that require user action
 */
export function getInteractiveMessageTypes(): MessageTypeConfig[] {
  return Object.values(MESSAGE_TYPE_CONFIG).filter((config) => config.requiresUserAction);
}
