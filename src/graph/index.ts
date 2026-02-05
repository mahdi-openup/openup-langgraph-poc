import { StateGraph, START, END } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { GraphState, type GraphStateType } from './state.js';
import { orchestratorNode } from './nodes/orchestrator.js';
import { toolExecutorNode } from './nodes/tools.js';

function shouldContinue(state: GraphStateType): 'tools' | 'end' {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage?._getType() === 'ai') {
    const aiMsg = lastMessage as AIMessage;
    if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
      return 'tools';
    }
  }

  return 'end';
}

export function createOrchestratorGraph() {
  return new StateGraph(GraphState)
    .addNode('orchestrator', orchestratorNode)
    .addNode('tools', toolExecutorNode)
    .addEdge(START, 'orchestrator')
    .addConditionalEdges('orchestrator', shouldContinue, {
      tools: 'tools',
      end: END,
    })
    .addEdge('tools', 'orchestrator')
    .compile();
}

export { GraphState, type GraphStateType } from './state.js';
