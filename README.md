# OpenUp LangGraph PoC

Agentic chatbot architecture using LangGraph with emergency circuit breaker pattern.

## Architecture

```
User Message
     │
     ├────────────────┬─────────────────────────┐
     ▼                ▼                         │
┌─────────┐    ┌─────────────┐                 │
│Emergency│    │ Orchestrator│                 │
│ (fast)  │    │  + Tools    │                 │
└────┬────┘    └──────┬──────┘                 │
     │                │                         │
     └───────┬────────┘                         │
             ▼                                  │
   ┌─────────────────────┐                     │
   │  Circuit Breaker    │                     │
   │                     │                     │
   │  • Emergency first  │────→ Emergency      │
   │    & true? TRIP!    │      Response       │
   │                     │                     │
   │  • Otherwise use    │────→ Orchestrator   │
   │    orchestrator     │      Response       │
   └─────────────────────┘                     │
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key
copy .env.example .env
# Edit .env and add OPENAI_API_KEY

# Run tests
pnpm test
```

## Key Features

- **Circuit Breaker**: Emergency check runs parallel, trips immediately if crisis detected
- **Orchestrator Pattern**: Single LLM with tools for natural conversation flow
- **Tools**: search_content, search_experts, needs_clarification

## Project Structure

```
src/
├── index.ts              # Main entry, chat() function
├── types/index.ts        # TypeScript types
├── prompts/
│   ├── orchestrator.ts   # Main conversation prompt
│   └── emergency.ts      # Fast safety check prompt
├── services/
│   ├── emergency.ts      # Emergency check function
│   └── circuitBreaker.ts # Circuit breaker logic
├── tools/
│   └── definitions.ts    # Tool definitions (search, etc.)
└── graph/
    ├── index.ts          # Graph assembly
    ├── state.ts          # State definition
    └── nodes/
        ├── orchestrator.ts
        └── tools.ts
```

## Extending

To add new tools, edit `src/tools/definitions.ts` and add to the `allTools` array.
