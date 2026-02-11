// src/graph/nodes/orchestrator.ts
// Main orchestrator node that handles:
// 1. Emergency detection (fast check first)
// 2. User engagement and conversation
// 3. Routing to specialized agents when needed

import { ORCHESTRATOR_PROMPT } from '../../prompts/orchestrator.js';
import { EMERGENCY_PROMPT } from '../../prompts/emergency.js';
import { CRISIS_RESOURCES, EMERGENCY_MESSAGE } from '../../constants/emergency.js';
import { getOrchestratorModel, getNonStreamingFastModel } from '../../constants/models.js';
import type { GraphStateType } from '../state.js';
import { getMessageType } from '../utils.js';
import { SystemMessage, AIMessage } from '@langchain/core/messages';

// ============================================
// EMERGENCY CHECK (Fast model)
// ============================================

async function checkEmergency(
  message: string,
  conversationHistory?: string
): Promise<{ isEmergency: boolean }> {
  try {
    console.log('[Orchestrator] Emergency check for:', message.substring(0, 50));
    const fastModel = getNonStreamingFastModel();

    // Include conversation context if available
    const userContent = conversationHistory
      ? `Previous conversation:\n${conversationHistory}\n\nCurrent message to analyze: ${message}`
      : message;

    const response = await fastModel.invoke([
      { role: 'system', content: EMERGENCY_PROMPT },
      { role: 'user', content: userContent },
    ]);

    const content = response.content as string;
    console.log('[Orchestrator] Emergency raw response:', content);

    // Extract JSON from response (handles markdown code blocks and extra text)
    const jsonMatch = content.match(/\{[\s\S]*"isEmergency"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Orchestrator] No JSON found in response:', content);
      // Fail CLOSED for safety - assume emergency if we can't parse
      return { isEmergency: true };
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log('[Orchestrator] Emergency check result:', result.isEmergency);
    return { isEmergency: result.isEmergency === true };
  } catch (error) {
    console.error('[Orchestrator] Emergency check error:', error);
    // Fail CLOSED for safety - assume emergency if parsing fails
    return { isEmergency: true };
  }
}

// ============================================
// ORCHESTRATOR NODE
// ============================================

export async function orchestratorNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const lastMessage = state.messages.at(-1);

  // Get the user's message content
  const messageType = getMessageType(lastMessage);
  const messageContent = typeof lastMessage?.content === 'string' ? lastMessage.content : '';
  const userMessage = messageType === 'human' ? messageContent : '';

  console.log('[Orchestrator] ====================================');
  console.log('[Orchestrator] Processing message:', userMessage.substring(0, 100));
  console.log('[Orchestrator] Messages count:', state.messages.length);
  console.log('[Orchestrator] Message type:', messageType);

  // Step 1: Emergency check (only for new human messages)
  if (messageType === 'human' && userMessage) {
    // Build conversation history for context (exclude current message)
    const historyMessages = state.messages.slice(0, -1);
    const conversationHistory = historyMessages.length > 0
      ? historyMessages.map(msg => {
          const type = getMessageType(msg);
          const content = typeof msg.content === 'string' ? msg.content : '';
          return `${type === 'human' ? 'User' : 'AI'}: ${content}`;
        }).join('\n')
      : undefined;

    const emergencyResult = await checkEmergency(userMessage, conversationHistory);

    if (emergencyResult.isEmergency) {
      console.log('[Orchestrator] EMERGENCY DETECTED - returning emergency response');
      return {
        messages: [new AIMessage(EMERGENCY_MESSAGE)],
        isEmergency: true,
        responseMessage: EMERGENCY_MESSAGE,
        responseMessageType: 'emergency',
        responsePayload: CRISIS_RESOURCES,
      };
    }
  }

  // Step 2: Normal conversation flow
  const systemPrompt = ORCHESTRATOR_PROMPT.replaceAll(
    '{conversationLanguage}',
    state.conversationLanguage
  );

  const messagesWithSystem = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  try {
    const model = getOrchestratorModel();
    console.log('[Orchestrator] Invoking main model...');
    const response = await model.invoke(messagesWithSystem);
    console.log('[Orchestrator] Model response received');

    // Check if model wants to use tools (route to agents)
    if (response instanceof AIMessage && response.tool_calls && response.tool_calls.length > 0) {
      console.log('[Orchestrator] Tool calls requested:', response.tool_calls.map(tc => ({
        name: tc.name,
        args: tc.args,
      })));
      return { messages: [response] };
    }

    // Final response (either direct or after processing tool results)
    const responseText = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    // Check if we just processed tool results THIS orchestrator run
    // Tool results are present when the last message before our response is a ToolMessage
    const lastMessageBeforeResponse = state.messages.at(-1);
    const hasToolResultsThisTurn = getMessageType(lastMessageBeforeResponse) === 'tool' && state.responsePayload;

    const messageType = hasToolResultsThisTurn ? state.responseMessageType : 'text';
    const payload = hasToolResultsThisTurn ? state.responsePayload : null;

    if (payload) {
      console.log('[Orchestrator] Preserving structured data from tools. Type:', messageType);
      console.log('[Orchestrator] Response:', responseText.substring(0, 100));
    } else {
      console.log('[Orchestrator] Direct text response:', responseText.substring(0, 100));
    }

    return {
      messages: [response],
      responseMessage: responseText,
      responseMessageType: messageType,
      responsePayload: payload,
    };
  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    return {
      responseMessage: "I'm here to support your wellbeing. What's on your mind?",
      responseMessageType: 'text',
      responsePayload: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
