import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { createOrchestratorGraph } from './graph/index.js';
import { withEmergencyCircuitBreaker } from './services/circuitBreaker.js';
import type { ChatResponse, ChatOptions } from './types/index.js';

const graph = createOrchestratorGraph();

/**
 * Main chat function with emergency circuit breaker
 */
export async function chat(
  userMessage: string,
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const {
    conversationLanguage = 'en-GB',
    conversationId = crypto.randomUUID(),
    conversationHistory = [],
  } = options;

  const messages: BaseMessage[] = [
    ...conversationHistory,
    new HumanMessage(userMessage),
  ];

  // Orchestrator function (to be raced against emergency check)
  const runOrchestrator = async (): Promise<string> => {
    const result = await graph.invoke({
      messages,
      conversationLanguage,
      conversationId,
    });

    return result.responseMessage || "I'm here to help. What's on your mind?";
  };

  // Run with circuit breaker
  return withEmergencyCircuitBreaker(userMessage, runOrchestrator, {
    emergencyTimeoutMs: 2000,
  });
}

/**
 * Convert simple message history to LangChain format
 */
export function toMessages(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): BaseMessage[] {
  return history.map((msg) =>
    msg.role === 'user'
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content)
  );
}

// ============================================
// Test scenarios
// ============================================
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('OpenUp LangGraph PoC - Circuit Breaker Pattern');
  console.log('='.repeat(60));

  // Test 1: Normal stress message
  console.log('\n📝 Test 1: Normal stress message');
  console.log('-'.repeat(40));
  const start1 = Date.now();
  const result1 = await chat("I've been really stressed about work lately and can't focus");
  console.log(`⏱️  Time: ${Date.now() - start1}ms`);
  console.log(`🚨 Emergency: ${result1.isEmergency}`);
  console.log(`💬 Response: ${result1.message}`);

  // Test 2: Content request
  console.log('\n📝 Test 2: Content request');
  console.log('-'.repeat(40));
  const start2 = Date.now();
  const result2 = await chat('Do you have any videos about managing anxiety?');
  console.log(`⏱️  Time: ${Date.now() - start2}ms`);
  console.log(`🚨 Emergency: ${result2.isEmergency}`);
  console.log(`💬 Response: ${result2.message}`);

  // Test 3: Book session
  console.log('\n📝 Test 3: Book session request');
  console.log('-'.repeat(40));
  const start3 = Date.now();
  const result3 = await chat('I want to talk to someone about my burnout');
  console.log(`⏱️  Time: ${Date.now() - start3}ms`);
  console.log(`🚨 Emergency: ${result3.isEmergency}`);
  console.log(`💬 Response: ${result3.message}`);

  // Test 4: Emergency message (should trip circuit)
  console.log('\n📝 Test 4: Emergency message (circuit should trip)');
  console.log('-'.repeat(40));
  const start4 = Date.now();
  const result4 = await chat("I can't do this anymore. I want to disappear.");
  console.log(`⏱️  Time: ${Date.now() - start4}ms`);
  console.log(`🚨 Emergency: ${result4.isEmergency}`);
  console.log(`💬 Response: ${result4.message}`);

  // Test 5: Multi-turn conversation
  console.log('\n📝 Test 5: Multi-turn conversation');
  console.log('-'.repeat(40));
  const history = toMessages([
    { role: 'user', content: 'I have trouble sleeping' },
    { role: 'assistant', content: 'I hear you. Sleep issues can be really draining. Is this related to stress or more about your sleep habits and routine?' },
  ]);
  const start5 = Date.now();
  const result5 = await chat("It's mostly stress from work, my mind races at night", {
    conversationHistory: history,
  });
  console.log(`⏱️  Time: ${Date.now() - start5}ms`);
  console.log(`🚨 Emergency: ${result5.isEmergency}`);
  console.log(`💬 Response: ${result5.message}`);

  // Test 6: Off-scope request
  console.log('\n📝 Test 6: Off-scope request');
  console.log('-'.repeat(40));
  const start6 = Date.now();
  const result6 = await chat('Can you give me a recipe for lasagna?');
  console.log(`⏱️  Time: ${Date.now() - start6}ms`);
  console.log(`🚨 Emergency: ${result6.isEmergency}`);
  console.log(`💬 Response: ${result6.message}`);

  console.log('\n' + '='.repeat(60));
  console.log('Tests complete!');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
