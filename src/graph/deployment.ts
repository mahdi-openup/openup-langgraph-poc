/**
 * LangGraph Platform Deployment Entry Point
 * 
 * This file exports the compiled graph for LangGraph Platform.
 * The circuit breaker logic is integrated into the graph itself.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { ToolMessage } from '@langchain/core/messages';
import { allTools, toolsByName } from '../tools/definitions.js';
import { ORCHESTRATOR_PROMPT } from '../prompts/orchestrator.js';
import { EMERGENCY_PROMPT } from '../prompts/emergency.js';

// ============================================
// State Definition
// ============================================
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  conversationLanguage: Annotation<string>({
    reducer: (_, update) => update,
    default: () => 'en-GB',
  }),
  conversationId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  // Emergency state
  isEmergency: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),
  emergencyChecked: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),
  // Response
  responseMessage: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});

type GraphStateType = typeof GraphState.State;

// ============================================
// Models
// ============================================
const fastModel = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
  maxTokens: 20,
});

const orchestratorModel = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.7,
}).bindTools(allTools);

// ============================================
// Nodes
// ============================================

// Emergency check node (fast)
async function emergencyNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (!lastMessage || lastMessage._getType() !== 'human') {
    return { isEmergency: false, emergencyChecked: true };
  }

  try {
    const response = await fastModel.invoke([
      { role: 'system', content: EMERGENCY_PROMPT },
      { role: 'user', content: lastMessage.content as string },
    ]);
    
    const result = JSON.parse(response.content as string);
    return { isEmergency: result.isEmergency === true, emergencyChecked: true };
  } catch (error) {
    console.error('[Emergency] Error:', error);
    return { isEmergency: false, emergencyChecked: true };
  }
}

// Emergency response node
async function emergencyResponseNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  return {
    responseMessage: `I'm concerned about what you're sharing. Your safety matters most right now.

If you're in immediate danger, please reach out:
• Netherlands: 113 (Zelfmoordpreventie)
• Belgium: 1813
• UK: 116 123 (Samaritans)
• International: Your local emergency services

Are you safe right now? Is someone with you?`,
  };
}

// Orchestrator node
async function orchestratorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const systemPrompt = ORCHESTRATOR_PROMPT.replace(
    /{conversationLanguage}/g,
    state.conversationLanguage
  );

  try {
    const response = await orchestratorModel.invoke([
      { role: 'system', content: systemPrompt },
      ...state.messages,
    ]);

    if (response.tool_calls && response.tool_calls.length > 0) {
      return { messages: [response] };
    }

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

// Tool executor node
async function toolsNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage?._getType() !== 'ai') return {};
  
  const aiMessage = lastMessage as AIMessage;
  if (!aiMessage.tool_calls?.length) return {};

  const results: ToolMessage[] = [];
  
  for (const call of aiMessage.tool_calls) {
    const tool = toolsByName[call.name];
    if (!tool) {
      results.push(new ToolMessage({
        tool_call_id: call.id!,
        content: `Tool ${call.name} not found`,
      }));
      continue;
    }
    
    try {
      const result = await tool.invoke(call.args);
      results.push(new ToolMessage({
        tool_call_id: call.id!,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      }));
    } catch (error) {
      results.push(new ToolMessage({
        tool_call_id: call.id!,
        content: `Error: ${error}`,
      }));
    }
  }

  return { messages: results };
}

// ============================================
// Routing Functions
// ============================================

function routeAfterEmergency(state: GraphStateType): 'emergency_response' | 'orchestrator' {
  return state.isEmergency ? 'emergency_response' : 'orchestrator';
}

function shouldContinueOrchestrator(state: GraphStateType): 'tools' | '__end__' {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage?._getType() === 'ai') {
    const aiMsg = lastMessage as AIMessage;
    if (aiMsg.tool_calls?.length) {
      return 'tools';
    }
  }
  
  return '__end__';
}

// ============================================
// Graph Assembly
// ============================================

const workflow = new StateGraph(GraphState)
  // Nodes
  .addNode('emergency_check', emergencyNode)
  .addNode('emergency_response', emergencyResponseNode)
  .addNode('orchestrator', orchestratorNode)
  .addNode('tools', toolsNode)
  
  // Flow
  .addEdge(START, 'emergency_check')
  .addConditionalEdges('emergency_check', routeAfterEmergency, {
    emergency_response: 'emergency_response',
    orchestrator: 'orchestrator',
  })
  .addConditionalEdges('orchestrator', shouldContinueOrchestrator, {
    tools: 'tools',
    __end__: END,
  })
  .addEdge('tools', 'orchestrator')
  .addEdge('emergency_response', END);

// Export the compiled graph
export const graph = workflow.compile();

// Optional: Export with checkpointing for persistence
// import { MemorySaver } from '@langchain/langgraph';
// export const graph = workflow.compile({ checkpointer: new MemorySaver() });
