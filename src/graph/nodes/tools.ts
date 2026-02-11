import { ToolMessage, AIMessage } from '@langchain/core/messages';
import { toolsByName } from '../../tools/definitions.js';
import { parseToolResult, extractStateUpdates } from '../../types/helpers.js';
import type { GraphStateType } from '../state.js';
import { isAIMessage } from '../utils.js';

export async function toolExecutorNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !isAIMessage(lastMessage)) {
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

  // Parse the last tool result and extract state updates
  const lastToolMessage = toolResults.at(-1);
  if (lastToolMessage) {
    // Get content as string (handle both string and array types)
    const content = typeof lastToolMessage.content === 'string'
      ? lastToolMessage.content
      : JSON.stringify(lastToolMessage.content);

    const toolResult = parseToolResult(content);

    if (toolResult) {
      console.log(`[Tools] Extracted message type: ${toolResult.messageType}`);
      const stateUpdates = extractStateUpdates(toolResult);

      return {
        messages: toolResults,
        ...stateUpdates,
      };
    } else {
      console.warn('[Tools] Failed to parse tool result, state not updated');
    }
  }

  return { messages: toolResults };
}
