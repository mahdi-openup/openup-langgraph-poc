// src/graph/nodes/followup.ts
// Follow-up node - generates conversational follow-up after agent completion

import { getNonStreamingFastModel } from '../../constants/models.js';
import type { GraphStateType } from '../state.js';

// ============================================
// FOLLOW-UP PROMPT
// ============================================

const FOLLOWUP_PROMPT = `You are OpenUp's conversational support assistant. An action was just completed for the user.

Your task: Generate ONE short, natural follow-up question or offer to keep the conversation going.

Guidelines:
- Be warm and supportive, not robotic
- Ask ONE specific question (not multiple)
- Offer relevant next steps
- Keep it brief (1-2 sentences max)

Context about what just happened:
{context}

The user's original request was about: {topic}

Generate a natural follow-up that:
1. Acknowledges the completed action briefly (if appropriate)
2. Offers to explore further OR suggests a related topic OR asks if they'd like to talk to someone

Examples of good follow-ups:
- "Is there a specific aspect of this topic you'd like to explore more deeply?"
- "Would you like me to find more resources, or is there something else on your mind?"
- "Sometimes it helps to talk through these things with someone - would you like to book a session?"

Respond with ONLY the follow-up message, nothing else.`;

// ============================================
// FOLLOW-UP NODE
// ============================================

export async function followupNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log('[Followup] ====================================');
  console.log('[Followup] Response type:', state.responseMessageType);
  console.log('[Followup] Content topic:', state.contentTopic);
  console.log('[Followup] Content items count:', state.contentItems?.length);
  console.log('[Followup] Experts count:', state.experts?.length);

  try {
    const model = getNonStreamingFastModel();

    // Build context based on response type
    let context = '';
    let topic = '';

    if (state.responseMessageType === 'content_recommendations') {
      const itemCount = state.contentItems?.length ?? 0;
      topic = state.contentTopic || 'wellbeing';
      context = itemCount > 0
        ? `Found and showed ${itemCount} content items about "${topic}"`
        : `Searched for content about "${topic}" but found no results`;
    } else if (state.responseMessageType === 'expert_profiles') {
      const expertCount = state.experts?.length ?? 0;
      topic = 'finding an expert';
      context = expertCount > 0
        ? `Found and showed ${expertCount} experts`
        : 'Searched for experts but found none';
    } else {
      // Default fallback
      topic = 'your request';
      context = 'Provided information to the user';
    }

    const prompt = FOLLOWUP_PROMPT
      .replace('{context}', context)
      .replace('{topic}', topic);

    console.log('[Followup] Invoking model with context:', context);

    const response = await model.invoke([
      { role: 'system', content: prompt },
      { role: 'user', content: 'Generate a follow-up message.' },
    ]);

    console.log('[Followup] Model response received');

    const followupMessage = typeof response.content === 'string'
      ? response.content.trim()
      : '';

    console.log('[Followup] Generated message:', followupMessage);

    // Set follow-up as separate field ONLY - do not add to messages
    // This ensures proper rendering order: message → content/results → follow-up question
    // The frontend will render followupQuestion separately after the content cards
    return {
      followupQuestion: followupMessage,
    };
  } catch (error) {
    console.error('[Followup] Error generating follow-up:', error);
    console.error('[Followup] Error details:', error instanceof Error ? error.message : String(error));
    // On error, don't add follow-up
    return {
      followupQuestion: null,
    };
  }
}
