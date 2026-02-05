import { ChatOpenAI } from '@langchain/openai';
import { EMERGENCY_PROMPT } from '../prompts/emergency.js';

const fastModel = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
  maxTokens: 20,
});

export async function checkEmergency(message: string): Promise<boolean> {
  try {
    const response = await fastModel.invoke([
      { role: 'system', content: EMERGENCY_PROMPT },
      { role: 'user', content: message },
    ]);

    const content = response.content as string;
    const result = JSON.parse(content);
    return result.isEmergency === true;
  } catch (error) {
    console.error('[Emergency] Check failed:', error);
    // Fail OPEN - assume not emergency to avoid blocking
    // In production you might want to fail CLOSED
    return false;
  }
}
