// src/graph/nodes/bookingAgent.ts
// Booking Agent - handles session booking requests (placeholder for PoC)

import { AIMessage } from '@langchain/core/messages';
import type { GraphStateType } from '../state.js';

// ============================================
// BOOKING AGENT NODE
// ============================================

export async function bookingAgentNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log('[BookingAgent] ====================================');
  console.log('[BookingAgent] Processing booking request...');
  console.log('[BookingAgent] Messages count:', state.messages.length);

  const responseMessage = "Booking a session is not supported in this PoC. In the full version, I would help you find and book a session with one of our experts.";

  return {
    messages: [
      new AIMessage({
        content: responseMessage,
      }),
    ],
    responseMessage,
    responseMessageType: 'text',
    responsePayload: null,
    intent: 'BookSession',
    // Signal that booking agent completed - orchestrator will generate follow-up
    agentCompleted: 'booking',
  };
}
