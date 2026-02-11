// src/constants/models.ts - Centralized model configuration
import { AzureChatOpenAI } from '@langchain/openai';
import type { Runnable } from '@langchain/core/runnables';
import type { BaseMessage } from '@langchain/core/messages';
import { allTools } from '../tools/definitions.js';

// ============================================
// VALIDATION HELPER
// ============================================

function validateAzureConfig(): void {
  const required = [
    'AZURE_OPENAI_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Azure OpenAI environment variables: ${missing.join(', ')}`
    );
  }
}

// ============================================
// FAST MODEL (Emergency detection)
// ============================================

export function createFastModel() {
  validateAzureConfig();

  return new AzureChatOpenAI({
    // REQUIRED: Azure deployment configuration
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY!,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT??"https://openup-ai-production.cognitiveservices.azure.com/",
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_FAST??"gpt-5-mini",
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION??"2024-12-01-preview",
  });
}

// ============================================
// NON-STREAMING FAST MODEL (For followup - prevents token streaming)
// ============================================

export function createNonStreamingFastModel() {
  validateAzureConfig();

  return new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY!,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT??"https://openup-ai-production.cognitiveservices.azure.com/",
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_FAST??"gpt-5-mini",
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION??"2024-12-01-preview",
    streaming: false, // Disable streaming to prevent token-by-token output
  });
}

// ============================================
// ORCHESTRATOR MODEL (Main conversation + tools)
// ============================================

export function createOrchestratorModel(): Runnable<BaseMessage[], BaseMessage> {
  validateAzureConfig();

  return new AzureChatOpenAI({
    // REQUIRED: Azure deployment configuration
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY!,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT??"https://openup-ai-production.cognitiveservices.azure.com/",
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_MAIN??"gpt-5-mini",
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION??"2024-12-01-preview",
    streaming: false, // Disable streaming to ensure complete tool calls
  }).bindTools(allTools);
}

// ============================================
// SINGLETON INSTANCES (Lazy initialization)
// ============================================

let _fastModel: ReturnType<typeof createFastModel> | null = null;
let _nonStreamingFastModel: ReturnType<typeof createNonStreamingFastModel> | null = null;
let _orchestratorModel: ReturnType<typeof createOrchestratorModel> | null = null;

export function getFastModel() {
  if (!_fastModel) {
    console.log('[Models] Creating fast model with deployment:',
      process.env.AZURE_OPENAI_DEPLOYMENT_FAST);
    _fastModel = createFastModel();
  }
  return _fastModel;
}

export function getNonStreamingFastModel() {
  if (!_nonStreamingFastModel) {
    console.log('[Models] Creating non-streaming fast model with deployment:',
      process.env.AZURE_OPENAI_DEPLOYMENT_FAST);
    _nonStreamingFastModel = createNonStreamingFastModel();
  }
  return _nonStreamingFastModel;
}

export function getOrchestratorModel() {
  if (!_orchestratorModel) {
    console.log('[Models] Creating orchestrator model with deployment:',
      process.env.AZURE_OPENAI_DEPLOYMENT_MAIN);
    console.log('[Models] Tools:', allTools.map(t => t.name));
    _orchestratorModel = createOrchestratorModel();
  }
  return _orchestratorModel;
}

// Reset models (useful for testing or when tools change)
export function resetModels() {
  console.log('[Models] Resetting model singletons...');
  _fastModel = null;
  _nonStreamingFastModel = null;
  _orchestratorModel = null;
}
