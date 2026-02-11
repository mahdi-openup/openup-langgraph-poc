/**
 * LangGraph Platform Deployment Entry Point
 *
 * This file exports the compiled graph for LangGraph Platform.
 * Uses the same graph definition as the main entry point.
 */

import { createOrchestratorGraph } from './index.js';

// Export the compiled graph for LangGraph Platform
export const graph = createOrchestratorGraph();

// Graph metadata for LangSmith Studio
export const metadata = {
  name: "OpenUp Chatbot",
  description: "Mental health support chatbot with emergency detection, content recommendations, and session booking",
  version: "1.0.0",
  tags: ["mental-health", "emergency-detection", "content-recommendations", "session-booking", "azure-ai-search"],
  features: [
    "Emergency circuit breaker for crisis detection",
    "Intelligent content recommendation via Azure AI Search",
    "Expert session booking with availability checking",
    "Multi-language support",
    "Structured message types with payloads",
    "Follow-up question generation"
  ]
};

// Re-export types for convenience
export { GraphState, type GraphStateType } from './state.js';
