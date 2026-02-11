// src/graph/utils.ts - Shared utility functions for graph nodes

/**
 * Get message type in a way that works with both LangChain message instances
 * and plain deserialized objects (e.g., from LangSmith Studio).
 *
 * @param message - The message object (BaseMessage instance or plain object)
 * @returns The message type ('human', 'ai', 'system', etc.) or 'unknown'
 */
export function getMessageType(message: any): string {
  if (!message) return 'unknown';

  // Try .getType() method (LangChain instances)
  if (typeof message.getType === 'function') {
    return message.getType();
  }

  // Try ._getType() method (alternative)
  if (typeof message._getType === 'function') {
    return message._getType();
  }

  // Check for type property (deserialized objects)
  if (message.type) {
    return message.type;
  }

  // Check for role property (LangGraph Platform/Studio format)
  if (message.role) {
    return message.role;
  }

  // Check constructor name
  if (message.constructor?.name === 'HumanMessage') {
    return 'human';
  }
  if (message.constructor?.name === 'AIMessage') {
    return 'ai';
  }
  if (message.constructor?.name === 'SystemMessage') {
    return 'system';
  }

  return 'unknown';
}

/**
 * Check if a message is from a human/user.
 */
export function isHumanMessage(message: any): boolean {
  return getMessageType(message) === 'human';
}

/**
 * Check if a message is from an AI/assistant.
 */
export function isAIMessage(message: any): boolean {
  return getMessageType(message) === 'ai';
}
