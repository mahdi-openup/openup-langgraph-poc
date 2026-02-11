# Graph Architecture

This document describes the LangGraph architecture for the OpenUp conversational support system.

## Overview

The system uses a **tool-based LangGraph** following the standard orchestrator → tools → orchestrator pattern:

```
                    ┌─────────────────┐
                    │      START      │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │         Orchestrator         │
              │                              │
              │  1. Emergency Check (fast)   │
              │  2. User engagement          │
              │  3. Tool calls if needed     │
              └──────────────┬───────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
      Tool Calls?      Structured Data?    Direct Response
          │                  │             / Emergency
          ▼                  ▼                  │
┌─────────────────┐ ┌─────────────────┐        │
│   Tools Node    │ │  Followup Node  │        │
│                 │ │                 │        │
│ Execute tools:  │ │ Generate follow │        │
│ - search_content│ │ up questions    │        │
│ - search_experts│ │ after results   │        │
│ - get_avail.    │ │                 │        │
│ - book_session  │ │                 │        │
└────────┬────────┘ └────────┬────────┘        │
         │                   │                 │
         ▼                   ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Orchestrator  │ │       END       │ │       END       │
│ (process results│ └─────────────────┘ └─────────────────┘
│  generate resp) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Followup Node  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│       END       │
└─────────────────┘
```

## Nodes

### 1. Orchestrator (`orchestrator`)

**Purpose**: Central hub that handles all user interactions

**Models**:
- Fast model (gpt-4o-mini) for emergency detection
- Main model (gpt-4o) for conversation and routing

**Input**: Full conversation history + system prompt

**Process**:
1. **Emergency Check**: First, uses fast model to detect crisis indicators
2. **User Engagement**: If not emergency, engages in conversation
3. **Agent Routing**: Routes to specialized agents when needed

**Output**:
- Emergency detected → Return emergency response, route to END
- Tool call for content → Route to Content Agent
- Tool call for booking → Route to Booking Agent
- Direct response → Route to END

**File**: `src/graph/nodes/orchestrator.ts`

---

**Tools Available**:
| Tool | Description |
|------|-------------|
| `search_content` | Search for wellbeing content (articles, videos) |
| `search_experts` | Find mental health experts for booking sessions |
| `get_expert_availability` | Get available time slots for a specific expert |
| `book_session` | Book a session with an expert |

**File**: `src/graph/nodes/orchestrator.ts`

---

### 2. Tools Node (`tools`)

**Purpose**: Execute tool calls from the orchestrator

**Input**: Messages with tool calls from orchestrator

**Process**:
1. Extract tool calls from the last AI message
2. Execute each tool (search_content, search_experts, etc.)
3. Return tool results as ToolMessages

**Output**: Routes back to orchestrator to process results

**File**: `src/graph/nodes/tools.ts`

---

### 3. Followup Node (`followup`)

**Purpose**: Generate follow-up questions after structured data is returned

**Input**: State with responsePayload (structured data from tools)

**Process**:
1. Analyze the structured response (content recommendations, expert profiles, etc.)
2. Generate contextual follow-up questions
3. Store in state for frontend to display

**Output**: Routes to END

**File**: `src/graph/nodes/followup.ts`

---

### Standalone Nodes (Not in Main Graph)

The following nodes exist but are **not wired into the main graph**. They can be used for alternative architectures:

- **Content Agent** (`src/graph/nodes/contentAgent.ts`): Handles content requests with topic extraction
- **Booking Agent** (`src/graph/nodes/bookingAgent.ts`): Handles booking flow (PoC placeholder)

## Routing Logic

### After Orchestrator

```typescript
function routeAfterOrchestrator(state): 'tools' | 'followup' | 'end' {
  // If emergency was detected, end immediately
  if (state.isEmergency) {
    return 'end';
  }

  const lastMessage = state.messages.at(-1);

  // Check if the last message has tool calls (first orchestrator run)
  if (lastMessage?.getType() === 'ai') {
    const aiMsg = lastMessage as AIMessage;
    if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
      return 'tools';
    }
  }

  // No tool calls - check if we should generate follow-up (after tools)
  if (state.responsePayload && state.responseMessageType !== 'text') {
    return 'followup';
  }

  return 'end';
}
```

### After Tools

```typescript
function routeAfterTools(state): 'orchestrator' | 'end' {
  // After tools execute, always go back to orchestrator to process results
  const lastMessage = state.messages.at(-1);

  if (lastMessage?.getType() === 'tool') {
    return 'orchestrator';
  }

  return 'end';
}
```

## State Management

The graph uses LangGraph Annotations for state:

```typescript
GraphState = Annotation.Root({
  // Messages (append reducer)
  messages: BaseMessage[],

  // Conversation context (replace reducer)
  conversationLanguage: string,
  conversationId: string,

  // Emergency
  isEmergency: boolean,

  // Intent & Session
  intent: UserIntent | null,
  sessionType: SessionType | null,

  // Selections
  selectedExpertId: string | null,
  selectedSlotId: string | null,

  // Content state
  contentTopic: string | null,
  contentLanguage: string | null,
  contentType: 'articles' | 'videos' | null,
  conversationSummary: string | null,

  // Results cache
  experts: Expert[],
  timeSlots: TimeSlot[],
  contentItems: ContentItem[],

  // Response output
  responseMessage: string | null,
  responseMessageType: MessageType,
  responsePayload: any,

  // Agent completion tracking
  agentCompleted: 'content' | 'booking' | null,
  followupQuestion: string | null,

  // Error
  error: string | null,
});
```

## Message Types

The system supports multiple structured message types for the AG-UI protocol:

| Type | Description | Payload |
|------|-------------|---------|
| `text` | Plain text response | null |
| `emergency` | Crisis resources | `EmergencyPayload` |
| `expert_profiles` | Expert cards | `ExpertProfilesPayload` |
| `expert_availability` | Time slots | `ExpertAvailabilityPayload` |
| `session_booked` | Booking confirmation | `SessionBookedPayload` |
| `content_recommendations` | Articles/videos | `ContentRecommendationsPayload` |

## Example Flows

### Flow 1: Direct Content Request

```
User: "Show me articles about stress"
         │
Emergency Check → No emergency
         │
Orchestrator → Calls search_content(topic="stress", type="articles")
         │
Tools → Executes search_content
         │
Orchestrator → Generates response with results
         │
Followup → Generates follow-up questions
         │
END → content_recommendations message with follow-up
```

### Flow 2: Vague Content Request

```
User: "Suggest me some content"
         │
Emergency Check → No emergency
         │
Orchestrator → Direct response asking for topic
         │
END → text message (asking what topic they want)
```

### Flow 3: Multi-turn Content Request

```
User: "I'm stressed about work"
         │
Orchestrator → Direct response (empathetic)
         │
User: "Show me some videos"
         │
Orchestrator → Calls search_content(topic="stress", type="videos")
         │
Tools → Executes search_content
         │
Orchestrator → Generates response with results
         │
Followup → Generates follow-up questions
         │
END → content_recommendations message with follow-up
```

### Flow 4: Session Booking

```
User: "I want to talk to someone about anxiety"
         │
Orchestrator → Calls search_experts(sessionType="general")
         │
Tools → Returns expert profiles
         │
User: "I'd like to book with Dr. Smith"
         │
Orchestrator → Calls get_expert_availability(expertId="...")
         │
Tools → Returns time slots
         │
User: "Tomorrow at 10am"
         │
Orchestrator → Calls book_session(...)
         │
END → session_booked message
```

## Adding New Nodes

To add a new node to the graph:

### 1. Create Node Function

```typescript
// src/graph/nodes/myNode.ts
export async function myNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  // Node logic
  return {
    // State updates
  };
}
```

### 2. Add to Graph

```typescript
// src/graph/index.ts
import { myNode } from './nodes/myNode.js';

export function createOrchestratorGraph() {
  return new StateGraph(GraphState)
    .addNode('my_node', myNode)
    // Add edges...
    .compile();
}
```

### 3. Add Routing

```typescript
// Update the routing function
function routeAfterOrchestrator(state): 'tools' | 'followup' | 'my_node' | 'end' {
  // Add your routing condition
  if (someCondition) {
    return 'my_node';
  }
  // ... existing routing
}

// Add to conditional edges
.addConditionalEdges('orchestrator', routeAfterOrchestrator, {
  tools: 'tools',
  followup: 'followup',
  my_node: 'my_node',  // New route
  end: END,
})
```

## Files

| File | Purpose |
|------|---------|
| `src/graph/index.ts` | Graph definition and routing |
| `src/graph/state.ts` | State annotations |
| `src/graph/utils.ts` | Graph utility functions |
| `src/graph/nodes/orchestrator.ts` | Main orchestrator (includes emergency check) |
| `src/graph/nodes/tools.ts` | Tool executor node |
| `src/graph/nodes/followup.ts` | Follow-up question generator |
| `src/graph/nodes/contentAgent.ts` | Content agent (standalone, not in main graph) |
| `src/graph/nodes/bookingAgent.ts` | Booking agent (standalone, not in main graph) |
| `src/graph/deployment.ts` | LangGraph platform export |

## Debugging

### Enable Logging

Each node logs its activity:

```
[Emergency] Checking for emergency...
[Orchestrator] Starting with 2 messages
[Orchestrator] Tool calls requested: [{ name: 'search_content', args: {...} }]
[Tools] Executing: search_content
[ContentAgent] Processing content request...
```

### Visualize Graph

```typescript
import { createOrchestratorGraph } from './graph/index.js';

const graph = createOrchestratorGraph();
// Use LangGraph Studio or print graph structure
```

## Related Documentation

- [Content Agent](./content-agent.md)
- [Azure AI Search](./azure-ai-search.md)
- [Adding Message Types](./adding-message-types.md)
