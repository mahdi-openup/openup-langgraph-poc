import { ToolMessage, AIMessage } from '@langchain/core/messages';
import { toolsByName } from '../../tools/definitions.js';
import type { GraphStateType } from '../state.js';

export async function toolExecutorNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];

  if (!lastMessage || lastMessage._getType() !== 'ai') {
    return {};
  }

  const aiMessage = lastMessage as AIMessage;

  if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
    return {};
  }

  const toolResults: ToolMessage[] = [];

  for (const toolCall of aiMessage.tool_calls) {
    const tool = toolsByName[toolCall.name];

    if (!tool) {
      console.warn(`[Tools] Unknown tool: ${toolCall.name}`);
      toolResults.push(
        new ToolMessage({
          tool_call_id: toolCall.id!,
          content: `Tool ${toolCall.name} not found`,
        })
      );
      continue;
    }

    try {
      console.log(`[Tools] Executing: ${toolCall.name}`);
      const result = await tool.invoke(toolCall.args);
      toolResults.push(
        new ToolMessage({
          tool_call_id: toolCall.id!,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        })
      );
    } catch (error) {
      console.error(`[Tools] Error in ${toolCall.name}:`, error);
      toolResults.push(
        new ToolMessage({
          tool_call_id: toolCall.id!,
          content: `Error executing tool: ${error}`,
        })
      );
    }
  }

  return { messages: toolResults };
}
