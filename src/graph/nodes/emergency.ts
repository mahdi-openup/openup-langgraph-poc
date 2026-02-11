// src/graph/nodes/emergency.ts
import type { GraphStateType } from '../state.js';
import { EMERGENCY_PROMPT } from '../../prompts/emergency.js';
import { CRISIS_RESOURCES, EMERGENCY_MESSAGE } from '../../constants/emergency.js';
import { getFastModel } from '../../constants/models.js';
import { isHumanMessage } from '../utils.js';

export async function emergencyNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !isHumanMessage(lastMessage)) {
    console.log('[Emergency] No human message, returning false');
    return { isEmergency: false };
  }

  try {
    console.log('[Emergency] Checking message:', lastMessage.content);
    const fastModel = getFastModel();
    const response = await fastModel.invoke([
      { role: 'system', content: EMERGENCY_PROMPT },
      { role: 'user', content: lastMessage.content as string },
    ]);

    console.log('[Emergency] Model response:', response.content);
    const result = JSON.parse(response.content as string);
    console.log('[Emergency] Parsed result:', result);

    if (result.isEmergency) {
      console.log('[Emergency] EMERGENCY DETECTED - Setting messageType to emergency');
      return {
        isEmergency: true,
        responseMessage: EMERGENCY_MESSAGE,
        responseMessageType: 'emergency',
        responsePayload: CRISIS_RESOURCES,
      };
    }

    console.log('[Emergency] No emergency detected');
    return { isEmergency: false };
  } catch (error) {
    console.error('[Emergency] Error:', error);
    return { isEmergency: false };
  }
}
