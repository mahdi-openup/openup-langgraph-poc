# OpenUp LangGraph PoC

Agentic chatbot architecture using LangGraph with emergency circuit breaker pattern and Content Agent for intelligent content recommendations.

## Architecture

```
User Message
     │
     ▼
┌─────────────────────────────────────┐
│           Orchestrator              │
│                                     │
│  1. Emergency Check (fast model)    │
│  2. Engage with user                │
│  3. Call tools if needed            │
└────────────────┬────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
 Tools      Follow-up      Direct
  Node        Node        Response
    │            │            │
    ▼            │            ▼
┌────────┐       │       ┌────────┐
│ Tools  │       │       │  END   │
│Execute │       │       └────────┘
└───┬────┘       │
    │            │
    ▼            ▼
Orchestrator   END
(process results)
    │
    ▼
Follow-up → END
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Set environment variables
copy .env.example .env
# Edit .env with your Azure OpenAI and Azure AI Search credentials

# Run the server
pnpm dev

# Server runs at http://localhost:5005
```

## Environment Variables

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_MAIN=gpt-4o
AZURE_OPENAI_DEPLOYMENT_FAST=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Azure AI Search (optional - falls back to mock data)
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_API_KEY=your-search-key
AZURE_SEARCH_CONTENT_INDEX=content-index
AZURE_SEARCH_EXPERT_INDEX=expert-index
AZURE_SEARCH_USE_SEMANTIC=true
```

## Key Features

- **Emergency Circuit Breaker**: Fast safety check runs first, trips immediately if crisis detected
- **Orchestrator Pattern**: Main LLM with tools for natural conversation flow
- **Content Agent**: Intelligent content recommendation with topic extraction from conversation
- **Azure AI Search Integration**: Configurable search for content and experts
- **Vercel AI SDK**: Streaming data protocol for real-time UI updates
- **Extensible Message Types**: Type-safe structured responses with message annotations

## Tools

| Tool | Description |
|------|-------------|
| `search_content` | Search for wellbeing content (articles, videos) |
| `search_experts` | Find mental health experts for booking sessions |
| `get_expert_availability` | Get available time slots for a specific expert |
| `book_session` | Book a session with an expert |

## Message Types

| Type | Description |
|------|-------------|
| `text` | Plain text response |
| `emergency` | Crisis resources |
| `expert_profiles` | Expert cards for selection |
| `expert_availability` | Time slot picker |
| `session_booked` | Booking confirmation |
| `content_recommendations` | Articles/videos list |

## Project Structure

```
src/
├── index.ts                  # Entry point and LangGraph deployment
├── types/
│   ├── index.ts              # Core type definitions
│   ├── schemas.ts            # Zod validation schemas
│   ├── helpers.ts            # Helper functions
│   └── messageConfig.ts      # Message type metadata
├── prompts/
│   ├── orchestrator.ts       # Main conversation prompt
│   ├── emergency.ts          # Fast safety check prompt
│   └── contentRequest.ts     # Content extraction prompt
├── services/
│   ├── emergency.ts          # Emergency check function
│   ├── circuitBreaker.ts     # Circuit breaker logic
│   └── azureAiSearch.ts      # Azure AI Search integration
├── tools/
│   └── definitions.ts        # Tool definitions
├── constants/
│   ├── index.ts              # Constants exports
│   ├── models.ts             # Model configuration
│   └── emergency.ts          # Crisis resources
└── graph/
    ├── index.ts              # Graph assembly and routing
    ├── state.ts              # State definition
    ├── utils.ts              # Graph utilities
    ├── deployment.ts         # LangGraph platform export
    └── nodes/
        ├── orchestrator.ts   # Main orchestrator (includes emergency check)
        ├── tools.ts          # Tool executor node
        ├── followup.ts       # Follow-up question generator
        ├── contentAgent.ts   # Content agent (standalone, not in main graph)
        └── bookingAgent.ts   # Booking agent (standalone, not in main graph)
```

## Documentation

| Document | Description |
|----------|-------------|
| [Graph Architecture](docs/graph-architecture.md) | Overall system architecture and node details |
| [Content Agent](docs/content-agent.md) | Content recommendation agent documentation |
| [Azure AI Search](docs/azure-ai-search.md) | Search integration and configuration |
| [Adding Message Types](docs/adding-message-types.md) | Guide to adding new message types |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` or `/` | POST | Vercel AI SDK v3 data stream chat endpoint |
| `/health` | GET | Health check |
| `/message-types` | GET | List available message types |

### Chat Request Format

```typescript
{
  threadId?: string;      // Optional conversation thread ID
  runId?: string;         // Optional run ID
  messages: ChatMessage[]; // Array of messages (AI SDK v3 format)
  state?: object;         // Optional partial state
}
```

## Vercel AI SDK v3 Integration

The API uses Vercel AI SDK v3's data stream protocol for real-time streaming.

### Message Format

**AI SDK v3** uses a parts-based message structure:

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: [
    {
      type: 'text';
      text: string;
    }
  ];
}
```

### Stream Events

- **Lifecycle**: `run_started`, `run_finished`, `run_error`
- **Steps**: `step_started`, `step_finished`
- **Reasoning**: `reasoning_start`, `reasoning_delta`, `reasoning_end`
- **Tools**: `tool_call_start`, `tool_call_end`, `tool_call_result`
- **Messages**: `message_start`, `text_delta`, `message_end`
- **State**: `state_snapshot`
- **Annotations**: `message_annotations` (structured payloads)

### Frontend Integration

**React (Recommended):**
```typescript
import { useChat } from 'ai/react';

const { messages, append, isLoading } = useChat({
  api: '/chat',
  onFinish: (message) => {
    const { messageType, payload } = message.annotations;
    renderStructuredPayload(messageType, payload);
  },
});
```

**Vanilla JavaScript (AI SDK v3):**
```typescript
// AI SDK v3 message format
const messages = [
  {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'I need help with stress' }]
  }
];

const response = await fetch('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));

      switch (event.type) {
        case 'text_delta':
          appendText(event.content);
          break;
        case 'state_snapshot':
          updateState(event.snapshot);
          break;
      }
    } else if (line.startsWith('message_annotations: ')) {
      const annotation = JSON.parse(line.slice(21));
      renderPayload(annotation.messageType, annotation.payload);
    }
  }
}
```

## Testing with cURL

**AI SDK v3 Format:**

```bash
curl -X POST http://localhost:5005/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "1",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "I need help with stress"
          }
        ]
      }
    ]
  }'
```

## Extending

### Adding New Tools

1. Define tool in `src/tools/definitions.ts`
2. Add to `allTools` array
3. Update orchestrator prompt if needed

### Adding New Message Types

See [Adding Message Types](docs/adding-message-types.md) guide.

### Adding New Graph Nodes

1. Create node in `src/graph/nodes/`
2. Add to graph in `src/graph/index.ts`
3. Add routing logic

## License

Proprietary - OpenUp
