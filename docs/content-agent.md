# Content Agent

> **Note**: The Content Agent exists as a standalone node but is **NOT currently wired into the main graph**. The main graph uses the `search_content` tool directly via the orchestrator → tools pattern. This document describes the Content Agent's design for reference or potential future use.

The Content Agent is a specialized node that handles content recommendation requests. It understands what content the user wants by analyzing the conversation and searching Azure AI Search.

## Overview

The Content Agent follows the same pattern as the original `ContentRequest.yaml` prompt from the OpenUp chatbot system. It:

1. **Extracts content request details** from the conversation (topic, language, content type)
2. **Asks clarifying questions** if the topic cannot be determined
3. **Searches Azure AI Search** when the topic is clear
4. **Returns AG-UI formatted responses** (`content_recommendations` or `text` for questions)

## Current Status

**The Content Agent is NOT used in the main graph.** Instead, the system uses:
- `search_content` tool - called by the orchestrator when user has a clear topic
- Direct orchestrator responses - when user needs clarification

## Architecture (Standalone Design)

If the Content Agent were wired into the graph, the flow would be:

```
User: "suggest me some content"
         │
         ▼
┌─────────────────┐
│  Orchestrator   │ ──► Routes to Content Agent
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Content Agent  │
│                 │
│  1. Extract     │ ◄── Uses CONTENT_REQUEST_PROMPT
│     topic/lang  │     with fast model (gpt-4o-mini)
│                 │
│  2. Topic       │
│     missing?    │───► Yes ──► Return question (text)
│         │       │
│         No      │
│         ▼       │
│  3. Search      │ ◄── Uses ContentSearchService
│     Azure AI    │     (Azure AI Search)
│                 │
│  4. Return      │ ──► content_recommendations
│     results     │
└─────────────────┘
```

## Current Implementation (What's Actually Used)

The main graph uses the `search_content` tool directly:

```
User: "suggest me some content about stress"
         │
         ▼
┌─────────────────┐
│  Orchestrator   │ ──► Calls search_content tool
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Tools Node    │ ──► Executes search_content
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator   │ ──► Generates response with results
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Followup Node  │ ──► Generates follow-up questions
└─────────────────┘
```

## When Would Content Agent Be Used?

The Content Agent is designed for scenarios where:

1. User says vague content requests: "suggest me some content", "I want to read something"
2. User mentions content but without a specific topic
3. The topic needs to be extracted from earlier conversation context

**Current approach:** The orchestrator handles these cases directly by asking clarifying questions or inferring context from conversation history.

## Configuration

### Environment Variables

```bash
# Azure OpenAI (for content extraction model)
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_FAST=gpt-4o-mini  # Used for extraction

# Azure AI Search (for content search)
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_API_KEY=your-search-key
AZURE_SEARCH_CONTENT_INDEX=content-index
AZURE_SEARCH_USE_SEMANTIC=true  # Optional: enable semantic search
AZURE_SEARCH_SEMANTIC_CONFIG=default
```

## Flow Details

### Step 1: Content Request Extraction

The Content Agent uses a specialized prompt (`CONTENT_REQUEST_PROMPT`) to extract:

```typescript
interface ContentRequestExtraction {
  contentTopic: string | null;    // What the content should be about
  language: string | null;        // Preferred content language (e.g., "en-GB", "nl-NL")
  contentType: 'article' | 'video' | null;  // Preferred format
  question: string | null;        // Clarifying question if topic is missing
}
```

**Extraction Rules:**
- Topic can persist across conversation turns
- Language and content type can be specified after the topic
- If topic cannot be determined → ask ONE clarifying question
- Never invent or broaden the topic

### Step 2: Clarification (if needed)

If `contentTopic` is null, the agent returns a regular `text` message with a clarifying question:

```json
{
  "messageType": "text",
  "payload": null
}
```

The question is sent as a normal conversational message, e.g., "What topic would you like to explore? For example, managing stress, improving sleep, or building resilience."

### Step 3: Search Azure AI Search

If topic is found, the agent searches using `ContentSearchService`:

```typescript
const searchResponse = await searchService.search({
  searchText: topic,           // e.g., "managing stress"
  languageCode: language,      // e.g., "en-GB"
  types: contentType ? [contentType] : null,  // e.g., ["article"]
  pageSize: 3,
});
```

### Step 4: Return Results

Returns a `content_recommendations` message:

```json
{
  "messageType": "content_recommendations",
  "payload": {
    "items": [
      {
        "id": "content_1",
        "title": "Understanding stress",
        "description": "Learn about stress and its effects...",
        "type": "article",
        "topic": "managing stress",
        "duration": "5 min read",
        "url": "https://openup.com/content/1",
        "language": "en-GB"
      }
    ],
    "topic": "managing stress",
    "totalCount": 3
  }
}
```

## State Updates

The Content Agent updates the following graph state:

```typescript
{
  responseMessage: "I found 3 resources about...",
  responseMessageType: 'content_recommendations',
  responsePayload: { items, topic, totalCount },
  contentTopic: "managing stress",
  contentLanguage: "en-GB",
  contentType: "article",
  contentItems: [...],
  intent: 'ContentRecommendation',
}
```

## Example Conversations

### Example 1: Vague Request

```
User: "suggest me some content"
         │
Content Agent extracts: { contentTopic: null, question: "What topic..." }
         │
Response: "What topic would you like to explore?"
```

### Example 2: Multi-turn with Topic Persistence

```
User: "I've been feeling stressed lately"
Bot: "I'm sorry to hear that. Would you like some content or to talk to someone?"
User: "show me some videos"
         │
Content Agent extracts: { contentTopic: "stress", contentType: "video" }
         │
Response: [video content about stress]
```

### Example 3: Direct Topic with Language

```
User: "Do you have Dutch articles about burnout?"
         │
Content Agent extracts: { contentTopic: "burnout", language: "nl-NL", contentType: "article" }
         │
Response: [Dutch articles about burnout]
```

## Files

| File | Purpose |
|------|---------|
| `src/graph/nodes/contentAgent.ts` | Content Agent node implementation (standalone) |
| `src/prompts/contentRequest.ts` | Extraction prompt (from ContentRequest.yaml) |
| `src/services/azureAiSearch.ts` | Azure AI Search service |
| `src/tools/definitions.ts` | `search_content` tool (used by main graph) |
| `src/graph/index.ts` | Graph routing logic (does not include Content Agent) |

## Debugging

### Enable Logging

The Content Agent has built-in logging:

```
[ContentAgent] ====================================
[ContentAgent] Processing content request...
[ContentAgent] Messages count: 2
[ContentAgent] Last message type: human
[ContentAgent] Last message content: suggest me some content
[ContentAgent] Extraction result: { contentTopic: null, question: "..." }
[ContentAgent] Topic missing, asking question
```

### Common Issues

> **Note**: These issues apply if you wire the Content Agent into the graph.

1. **Content Agent not being called**
   - Ensure the node is added to the graph in `src/graph/index.ts`
   - Add routing logic to direct to the content agent node
   - Currently the main graph uses `search_content` tool directly instead

2. **Extraction returns wrong topic**
   - Check the conversation history being passed
   - The extraction model might be combining multiple topics

3. **Azure AI Search returns no results**
   - Check if `AZURE_SEARCH_ENDPOINT` is configured
   - Falls back to mock data if not configured
   - Verify the index name matches

## Related Documentation

- [Azure AI Search Integration](./azure-ai-search.md)
- [Adding Message Types](./adding-message-types.md)
- [Graph Architecture](./graph-architecture.md)
