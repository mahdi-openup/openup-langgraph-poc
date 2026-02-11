// src/services/circuitBreaker.ts
import { checkEmergency } from './emergency.js';
import type { ChatResponse, CircuitBreakerConfig } from '../types/index.js';
import { CRISIS_RESOURCES, EMERGENCY_MESSAGE } from '../constants/emergency.js';

const EMERGENCY_RESPONSE: ChatResponse = {
  message: EMERGENCY_MESSAGE,
  messageType: 'emergency',
  payload: CRISIS_RESOURCES,
  isEmergency: true,
};

function timeout<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

interface TaggedEmergency {
  source: 'emergency';
  isEmergency: boolean;
}

interface TaggedOrchestrator {
  source: 'orchestrator';
  message: string;
}

interface TaggedTimeout {
  source: 'timeout';
}

type RaceResult = TaggedEmergency | TaggedOrchestrator | TaggedTimeout;

/**
 * Circuit breaker that races emergency check against orchestrator.
 *
 * - If emergency=true finishes first → immediately return emergency response
 * - If orchestrator finishes first → check emergency result (likely done)
 * - If emergency times out → proceed with orchestrator (log late detection)
 */
export async function withEmergencyCircuitBreaker(
  lastUserMessage: string,
  orchestratorFn: () => Promise<string>,
  config: CircuitBreakerConfig = { emergencyTimeoutMs: 2000 }
): Promise<ChatResponse> {
  // Start both in parallel
  const emergencyPromise = checkEmergency(lastUserMessage);
  const orchestratorPromise = orchestratorFn();

  // Tag promises so we know which resolved first
  const taggedEmergency: Promise<TaggedEmergency> = emergencyPromise.then(
    (isEmergency) => ({ source: 'emergency', isEmergency })
  );

  const taggedOrchestrator: Promise<TaggedOrchestrator> = orchestratorPromise.then(
    (message) => ({ source: 'orchestrator', message })
  );

  const emergencyTimeout: Promise<TaggedTimeout> = timeout(
    config.emergencyTimeoutMs,
    { source: 'timeout' }
  );

  // Race all three
  const firstResult: RaceResult = await Promise.race([
    taggedEmergency,
    taggedOrchestrator,
    emergencyTimeout,
  ]);

  // CASE 1: Emergency detected first → TRIP immediately
  if (firstResult.source === 'emergency' && firstResult.isEmergency) {
    console.log('[CircuitBreaker] TRIPPED - Emergency detected first');
    return EMERGENCY_RESPONSE;
  }

  // CASE 2: Emergency clear first → wait for orchestrator
  if (firstResult.source === 'emergency' && !firstResult.isEmergency) {
    console.log('[CircuitBreaker] Emergency clear, waiting for orchestrator');
    const message = await orchestratorPromise;
    return { message, messageType: 'text', payload: null, isEmergency: false };
  }

  // CASE 3: Orchestrator finished first → check emergency (probably done)
  if (firstResult.source === 'orchestrator') {
    console.log('[CircuitBreaker] Orchestrator first, checking emergency');

    // Give emergency a short grace period
    const emergencyResult = await Promise.race([
      emergencyPromise,
      timeout(500, false),
    ]);

    if (emergencyResult === true) {
      console.log('[CircuitBreaker] TRIPPED - Emergency detected after orchestrator');
      return EMERGENCY_RESPONSE;
    }

    return { message: firstResult.message, messageType: 'text', payload: null, isEmergency: false };
  }

  // CASE 4: Emergency timed out → proceed with orchestrator
  if (firstResult.source === 'timeout') {
    console.log('[CircuitBreaker] Emergency timed out, proceeding');
    const message = await orchestratorPromise;

    // Fire-and-forget: check for late emergency
    emergencyPromise.then((isEmergency) => {
      if (isEmergency) {
        console.warn('[CircuitBreaker] LATE DETECTION - Emergency found after response sent!');
        // In production: trigger alert, log for review
      }
    });

    return { message, messageType: 'text', payload: null, isEmergency: false };
  }

  throw new Error('Unexpected circuit breaker state');
}
