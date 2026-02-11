// src/graph/nodes/contentAgent.ts
// Content Request Agent - understands content requests and searches Azure AI Search

import { AIMessage } from '@langchain/core/messages';
import { CONTENT_REQUEST_PROMPT } from '../../prompts/contentRequest.js';
import { getFastModel } from '../../constants/models.js';
import { getContentSearchService } from '../../services/azureAiSearch.js';
import type { GraphStateType } from '../state.js';
import type { ToolResult } from '../../types/index.js';
import { getMessageType } from '../utils.js';

// ============================================
// TYPES
// ============================================

interface ContentRequestExtraction {
  contentTopic: string | null;
  language: string | null;
  contentType: 'articles' | 'videos' | null;
  question: string | null;
}

// ============================================
// CONTENT AGENT NODE
// ============================================

export async function contentAgentNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log('[ContentAgent] ====================================');
  console.log('[ContentAgent] Processing content request...');
  console.log('[ContentAgent] Messages count:', state.messages.length);
  const lastMsg = state.messages.at(-1);
  console.log('[ContentAgent] Last message type:', getMessageType(lastMsg));
  console.log('[ContentAgent] Last message content:', typeof lastMsg?.content === 'string' ? lastMsg.content.substring(0, 100) : 'non-string');

  try {
    // Step 1: Extract content request details from conversation
    const extraction = await extractContentRequest(state);
    console.log('[ContentAgent] Extraction result:', extraction);

    // Step 2: If topic is missing, ask clarifying question (as regular text)
    if (!extraction.contentTopic && extraction.question) {
      console.log('[ContentAgent] Topic missing, asking question');

      return {
        messages: [
          new AIMessage({
            content: extraction.question,
          }),
        ],
        responseMessage: extraction.question,
        responseMessageType: 'text',
        responsePayload: null,
        intent: 'ContentRecommendation',
      };
    }

    // Step 3: We have a topic, search for content
    const topic = extraction.contentTopic!;
    const language = extraction.language || state.conversationLanguage || 'en-GB';
    const contentType = extraction.contentType;

    console.log('[ContentAgent] Searching content:', { topic, language, contentType });

    const searchService = getContentSearchService();
    const searchResponse = await searchService.search({
      searchText: topic,
      languageCode: language,
      types: contentType ? [contentType] : null,
      pageSize: 3,
    });

    const items = searchResponse.pagedResults;

    // Step 4: Return content recommendations
    const textContent = items.length > 0
      ? `I found ${items.length} resources about ${topic} that might help you.`
      : `I couldn't find specific content about ${topic}. Would you like me to search for something related?`;

    const result: ToolResult<'content_recommendations'> = {
      messageType: 'content_recommendations',
      payload: {
        items,
        topic,
        totalCount: searchResponse.totalCount,
      },
      textContent,
    };

    console.log('[ContentAgent] Returning payload with', items.length, 'items');
    console.log('[ContentAgent] Payload:', JSON.stringify(result.payload).substring(0, 200));

    return {
      messages: [
        new AIMessage({
          content: textContent,
          additional_kwargs: {
            tool_result: result,
            messageType: 'content_recommendations',
            payload: result.payload,
          },
        }),
      ],
      responseMessage: textContent,
      responseMessageType: 'content_recommendations',
      responsePayload: result.payload,
      contentTopic: topic,
      contentLanguage: extraction.language,
      contentType: extraction.contentType,
      contentItems: items,
      intent: 'ContentRecommendation',
      // Signal that content agent completed - orchestrator will generate follow-up
      agentCompleted: 'content',
    };
  } catch (error) {
    console.error('[ContentAgent] Error:', error);

    return {
      responseMessage: "I'd like to help you find some content. What topic are you interested in?",
      responseMessageType: 'text',
      responsePayload: null,
      error: error instanceof Error ? error.message : 'Content agent error',
    };
  }
}

// ============================================
// CONTENT REQUEST EXTRACTION
// ============================================

async function extractContentRequest(
  state: GraphStateType
): Promise<ContentRequestExtraction> {
  const model = getFastModel();

  // Build messages for the extraction model
  const messagesWithSystem = [
    { role: 'system' as const, content: CONTENT_REQUEST_PROMPT },
    ...state.messages.map((msg) => ({
      role: getMessageType(msg) === 'human' ? ('user' as const) : ('assistant' as const),
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    })),
  ];

  try {
    const response = await model.invoke(messagesWithSystem);
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    // Parse JSON response
    const jsonRegex = /\{[\s\S]*\}/;
    const jsonMatch = jsonRegex.exec(content);
    if (!jsonMatch) {
      console.error('[ContentAgent] No JSON found in response:', content);
      return {
        contentTopic: null,
        language: null,
        contentType: null,
        question: "What topic would you like to explore? For example, managing stress, improving sleep, or building resilience.",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ContentRequestExtraction;

    // Validate the extraction
    return {
      contentTopic: parsed.contentTopic || null,
      language: parsed.language || null,
      contentType: parsed.contentType || null,
      question: parsed.question || null,
    };
  } catch (error) {
    console.error('[ContentAgent] Extraction error:', error);
    return {
      contentTopic: null,
      language: null,
      contentType: null,
      question: "What topic would you like to explore?",
    };
  }
}

// ============================================
// HELPER: Check if this is a content request
// ============================================

export function isContentRequest(state: GraphStateType): boolean {
  // Check last message for content-related keywords
  const lastMessage = state.messages.at(-1);
  if (!lastMessage) return false;

  const content = typeof lastMessage.content === 'string'
    ? lastMessage.content.toLowerCase()
    : '';

  const contentKeywords = [
    'article', 'video', 'content', 'read', 'watch',
    'information', 'learn', 'resources', 'tips',
    'help with', 'about', 'recommend',
  ];

  return contentKeywords.some(keyword => content.includes(keyword));
}
