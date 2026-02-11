// src/graph/index.ts
// LangGraph definition for the OpenUp conversational support system
//
// Flow (LangGraph Best Practice - Tool Execution Pattern):
//   START → orchestrator → tools → orchestrator → END
//              ↓                      ↓
//              ↓ (no tools)           ↓ (processes tool results)
//              ↓                      ↓
//             END                    END
//
// The orchestrator:
// - Detects emergencies (returns emergency response if detected)
// - Engages in conversation with the user
// - Calls tools when needed (search_content, search_experts, get_expert_availability, book_session)
//
// Tools node:
// - Executes tool calls from orchestrator
// - Returns structured results back to orchestrator
//
// The orchestrator sees tool results and generates final response based on the tool output

import { StateGraph, START, END } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { GraphState, type GraphStateType } from './state.js';
import { orchestratorNode } from './nodes/orchestrator.js';
import { toolExecutorNode } from './nodes/tools.js';
import { followupNode } from './nodes/followup.js';
import { getMessageType } from './utils.js';

// ============================================
// ROUTING LOGIC
// ============================================

function routeAfterOrchestrator(state: GraphStateType): 'tools' | 'followup' | 'end' {
  // If emergency was detected, end immediately
  if (state.isEmergency) {
    console.log('[Routing] Emergency detected, ending');
    return 'end';
  }

  const lastMessage = state.messages.at(-1);

  // Check if the last message has tool calls (first orchestrator run)
  if (getMessageType(lastMessage) === 'ai') {
    const aiMsg = lastMessage as AIMessage;
    if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
      console.log(`[Routing] ${aiMsg.tool_calls.length} tool call(s) detected, routing to tools node`);
      return 'tools';
    }
  }

  // No tool calls - check if we should generate follow-up (second orchestrator run after tools)
  if (state.responsePayload && state.responseMessageType !== 'text') {
    console.log('[Routing] Structured data returned, generating follow-up');
    return 'followup';
  }

  console.log('[Routing] No tool calls and no structured data, ending');
  return 'end';
}

function routeAfterTools(state: GraphStateType): 'orchestrator' | 'end' {
  // After tools execute, always go back to orchestrator to process results
  const lastMessage = state.messages.at(-1);

  if (getMessageType(lastMessage) === 'tool') {
    console.log('[Routing] Tool result received, returning to orchestrator');
    return 'orchestrator';
  }

  console.log('[Routing] No tool results, ending');
  return 'end';
}

// ============================================
// GRAPH DEFINITION
// ============================================

export function createOrchestratorGraph() {
  return new StateGraph(GraphState)
    // Nodes
    .addNode('orchestrator', orchestratorNode)
    .addNode('tools', toolExecutorNode)
    .addNode('followup', followupNode)

    // Edges
    .addEdge(START, 'orchestrator')

    // After orchestrator: call tools, generate followup, or end
    .addConditionalEdges('orchestrator', routeAfterOrchestrator, {
      tools: 'tools',
      followup: 'followup',
      end: END,
    })

    // After tools: go back to orchestrator to process results
    .addConditionalEdges('tools', routeAfterTools, {
      orchestrator: 'orchestrator',
      end: END,
    })

    // After followup: end
    .addEdge('followup', END)

    .compile();
}

export { GraphState, type GraphStateType } from './state.js';
