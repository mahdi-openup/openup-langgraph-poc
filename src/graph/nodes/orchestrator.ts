import { ChatOpenAI } from '@langchain/openai';
import { ORCHESTRATOR_PROMPT } from '../../prompts/orchestrator.js';
import { allTools } from '../../tools/definitions.js';
import type { GraphStateType } from '../state.js';

const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.7,
}).bindTools(allTools);

export async function orchestratorNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const systemPrompt = ORCHESTRATOR_PROMPT.replace(
    /{conversationLanguage}/g,
    state.conversationLanguage
  );

  const messagesWithSystem = [
    { role: 'system' as const, content: systemPrompt },
    ...state.messages,
  ];

  try {
    const response = await model.invoke(messagesWithSystem);

    // Check if model wants to use tools
    if (response.tool_calls && response.tool_calls.length > 0) {
      return { messages: [response] };
    }

    // Direct response (no tools needed)
    return {
      messages: [response],
      responseMessage: response.content as string,
    };
  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    return {
      responseMessage: "I'm here to support your wellbeing. What's on your mind?",
    };
  }
}
