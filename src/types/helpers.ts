// src/types/helpers.ts
// Helper functions for parsing and extracting tool results

import { PayloadSchemas, ToolResultSchema } from './schemas.js';
import type { ToolResult, MessageType } from './index.js';

/**
 * Parse and validate a tool result from JSON string
 *
 * @param jsonString - JSON string returned by a tool
 * @returns Parsed and validated ToolResult, or null if parsing/validation fails
 */
export function parseToolResult(jsonString: string): ToolResult | null {
  try {
    // First, validate basic structure
    const parsed = JSON.parse(jsonString);
    const basicValidation = ToolResultSchema.safeParse(parsed);

    if (!basicValidation.success) {
      console.error('[ToolResult] Invalid tool result structure:', basicValidation.error.format());
      return null;
    }

    const result = parsed as ToolResult;

    // Validate payload against message type-specific schema
    const payloadSchema = PayloadSchemas[result.messageType];
    const payloadValidation = payloadSchema.safeParse(result.payload);

    if (!payloadValidation.success) {
      console.error(
        `[ToolResult] Invalid payload for message type "${result.messageType}":`,
        payloadValidation.error.format()
      );
      return null;
    }

    return result;
  } catch (error) {
    console.error('[ToolResult] Parse error:', error);
    return null;
  }
}

/**
 * Extract state updates from a tool result
 *
 * This function determines what graph state fields should be updated based
 * on the message type and payload of a tool result.
 *
 * @param result - Validated tool result
 * @returns Object with state updates to merge into graph state
 */
export function extractStateUpdates(result: ToolResult): Record<string, any> {
  const updates: Record<string, any> = {
    responseMessageType: result.messageType,
    responsePayload: result.payload,
    responseMessage: result.textContent,
  };

  // Extract message type-specific state updates
  switch (result.messageType) {
    case 'expert_profiles':
      if (result.payload && 'experts' in result.payload) {
        updates.experts = result.payload.experts;
      }
      break;

    case 'expert_availability':
      if (result.payload && 'slots' in result.payload) {
        updates.timeSlots = result.payload.slots;
      }
      break;

    case 'content_recommendations':
      if (result.payload && 'items' in result.payload) {
        updates.contentItems = result.payload.items;
        if ('topic' in result.payload) {
          updates.contentTopic = result.payload.topic;
        }
      }
      break;

    case 'session_booked':
      if (result.payload && 'session' in result.payload) {
        const session = result.payload.session;
        updates.selectedExpertId = session.expert.id;
        updates.selectedSlotId = session.slot.id;
      }
      break;

    case 'emergency':
      updates.isEmergency = true;
      break;

    // text doesn't need special state updates
    case 'text':
    default:
      break;
  }

  return updates;
}

/**
 * Validate a payload against its message type schema
 *
 * @param messageType - The message type
 * @param payload - The payload to validate
 * @returns Validation result with success flag and error details
 */
export function validatePayload(
  messageType: MessageType,
  payload: unknown
): { success: boolean; error?: string } {
  const schema = PayloadSchemas[messageType];
  const validation = schema.safeParse(payload);

  if (validation.success) {
    return { success: true };
  }

  return {
    success: false,
    error: JSON.stringify(validation.error.format(), null, 2),
  };
}
