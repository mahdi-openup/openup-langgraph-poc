# Adding New Message Types

This guide walks you through adding a new message type to the OpenUp LangGraph system.

## Quick Overview

Adding a new message type involves 5 steps:
1. Define TypeScript types
2. Create Zod validation schema
3. Add message type configuration
4. Update state extraction (if needed)
5. Create tool that returns the message type

**Time estimate**: 15-35 minutes

---

## Step-by-Step Guide

### Step 1: Define Types (src/types/index.ts)

Add your new message type to the `MessageType` union:

```typescript
export type MessageType =
  | 'text'
  | 'emergency'
  | 'expert_profiles'
  | 'expert_availability'
  | 'session_booked'
  | 'content_recommendations'
  | 'my_new_type'; // ADD THIS
```

Create the payload interface for your message type:

```typescript
export interface MyNewTypePayload {
  // Define your payload structure
  title: string;
  items: Array<{
    id: string;
    name: string;
  }>;
  metadata?: Record<string, unknown>;
}
```

Add your payload type to the `MessagePayloadMap`:

```typescript
export interface MessagePayloadMap {
  text: null;
  emergency: EmergencyPayload;
  expert_profiles: ExpertProfilesPayload;
  expert_availability: ExpertAvailabilityPayload;
  session_booked: SessionBookedPayload;
  content_recommendations: ContentRecommendationsPayload;
  my_new_type: MyNewTypePayload; // ADD THIS
}
```

(Optional) Create a type alias for convenience:

```typescript
export type MyNewTypeMessage = StructuredMessage<'my_new_type'>;
```

---

### Step 2: Create Zod Schema (src/types/schemas.ts)

Create a Zod schema that matches your payload interface:

```typescript
export const MyNewTypePayloadSchema = z.object({
  title: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  metadata: z.record(z.unknown()).optional(),
});
```

Add your schema to the `PayloadSchemas` map:

```typescript
export const PayloadSchemas: Record<MessageType, z.ZodSchema> = {
  text: z.null(),
  emergency: EmergencyPayloadSchema,
  expert_profiles: ExpertProfilesPayloadSchema,
  expert_availability: ExpertAvailabilityPayloadSchema,
  session_booked: SessionBookedPayloadSchema,
  content_recommendations: ContentRecommendationsPayloadSchema,
  my_new_type: MyNewTypePayloadSchema, // ADD THIS
};
```

**Tip**: Use Zod's type inference to ensure your schema matches your interface:

```typescript
type InferredType = z.infer<typeof MyNewTypePayloadSchema>;
// TypeScript will error if this doesn't match MyNewTypePayload
```

---

### Step 3: Add Configuration (src/types/messageConfig.ts)

Add metadata for your message type:

```typescript
export const MESSAGE_TYPE_CONFIG: Record<MessageType, MessageTypeConfig> = {
  // ... existing types
  my_new_type: {
    id: 'my_new_type',
    displayName: 'My New Type',
    category: 'content', // or 'booking', 'emergency', 'system'
    description: 'Brief description of what this message type represents',
    requiresUserAction: false, // Set to true if user needs to interact
    icon: 'icon-name', // Icon identifier for frontend
    metadata: {
      // Optional: Any additional UI hints
      customProperty: 'value',
    },
  },
};
```

**Category Options**:
- `content`: Content recommendations, articles, videos
- `booking`: Expert profiles, availability, booking confirmations
- `emergency`: Crisis support, emergency resources
- `system`: Internal system messages

---

### Step 4: Update State Extraction (src/types/helpers.ts)

If your message type needs to update the graph state, add a case to `extractStateUpdates()`:

```typescript
export function extractStateUpdates(result: ToolResult): Record<string, any> {
  const updates: Record<string, any> = {
    responseMessageType: result.messageType,
    responsePayload: result.payload,
    responseMessage: result.textContent,
  };

  switch (result.messageType) {
    // ... existing cases

    case 'my_new_type':
      if (result.payload && 'items' in result.payload) {
        updates.myCustomStateField = result.payload.items;
      }
      break;
  }

  return updates;
}
```

**Note**: If your message type doesn't need custom state updates (only responseMessageType and responsePayload), you can skip this step.

---

### Step 5: Create Tool (src/tools/definitions.ts)

Create a tool that returns your new message type:

```typescript
export const myNewTool = tool(
  async ({ param1, param2 }): Promise<string> => {
    console.log(`[Tool] myNewTool: ${param1}, ${param2}`);

    // Your tool logic here
    // TODO: Replace with actual implementation
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    // Create the tool result
    const result: ToolResult<'my_new_type'> = {
      messageType: 'my_new_type',
      payload: {
        title: 'My Results',
        items,
      },
      textContent: 'Here are the results I found for you.',
    };

    return JSON.stringify(result);
  },
  {
    name: 'my_new_tool',
    description: 'Describe when the AI should use this tool',
    schema: z.object({
      param1: z.string().describe('Description of parameter 1'),
      param2: z.string().optional().describe('Optional parameter'),
    }),
  }
);
```

Add your tool to the exports:

```typescript
export const allTools = [
  searchContentTool,
  searchExpertsTool,
  getExpertAvailabilityTool,
  bookSessionTool,
  handleContentRequestTool,
  myNewTool, // ADD THIS
];
```

---

## Testing

### 1. TypeScript Compilation

```bash
npm run build
```

If there are type errors, fix them before proceeding.

### 2. Test Validation

Create a simple test to verify your schema works:

```typescript
import { MyNewTypePayloadSchema } from './types/schemas.js';

const validPayload = {
  title: 'Test',
  items: [{ id: '1', name: 'Item' }],
};

const result = MyNewTypePayloadSchema.safeParse(validPayload);
console.log(result.success); // Should be true
```

### 3. Test API Endpoint

```bash
curl http://localhost:5005/message-types
```

Your new message type should appear in the response.

### 4. Integration Test

Run your tool and verify:
- Tool result is valid JSON
- Payload validation passes
- State updates correctly
- Frontend receives correct data

---

## Examples

### Example 1: Survey Message Type

```typescript
// 1. Types (src/types/index.ts)
export interface SurveyPayload {
  surveyId: string;
  questions: Array<{
    id: string;
    question: string;
    type: 'multiple_choice' | 'text' | 'rating';
    options?: string[];
  }>;
}

// 2. Schema (src/types/schemas.ts)
export const SurveyPayloadSchema = z.object({
  surveyId: z.string(),
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      type: z.enum(['multiple_choice', 'text', 'rating']),
      options: z.array(z.string()).optional(),
    })
  ),
});

// 3. Config (src/types/messageConfig.ts)
survey: {
  id: 'survey',
  displayName: 'Survey',
  category: 'system',
  description: 'Interactive survey with questions',
  requiresUserAction: true,
  icon: 'clipboard',
}

// 4. Tool (src/tools/definitions.ts)
export const getSurveyTool = tool(
  async ({ topic }): Promise<string> => {
    const result: ToolResult<'survey'> = {
      messageType: 'survey',
      payload: {
        surveyId: 'survey_123',
        questions: [
          {
            id: 'q1',
            question: 'How are you feeling today?',
            type: 'rating',
          },
        ],
      },
      textContent: 'I have a quick survey to help understand your needs better.',
    };
    return JSON.stringify(result);
  },
  {
    name: 'get_survey',
    description: 'Get a survey for the user to complete',
    schema: z.object({
      topic: z.string(),
    }),
  }
);
```

---

## Troubleshooting

### TypeScript Errors

**Error**: "Type 'my_new_type' is not assignable to type MessageType"

**Solution**: Make sure you added your type to the `MessageType` union in `src/types/index.ts`

---

**Error**: "Property 'my_new_type' is missing in type MessagePayloadMap"

**Solution**: Add your payload type to the `MessagePayloadMap` interface

---

### Runtime Errors

**Error**: "[ToolResult] Invalid payload for message type 'my_new_type'"

**Solution**: Your payload doesn't match the Zod schema. Check the console error for details about which field is invalid.

---

**Error**: "[Tools] Failed to parse tool result"

**Solution**: Make sure your tool returns `JSON.stringify(result)` and the result is a valid `ToolResult` object.

---

## Best Practices

1. **Keep payloads focused**: Each message type should have a clear, single purpose
2. **Use descriptive names**: Choose names that clearly indicate what the message type represents
3. **Document edge cases**: Add comments explaining any non-obvious validation rules
4. **Test thoroughly**: Verify both happy path and error cases
5. **Consider frontend**: Think about how the frontend will render your message type
6. **Be consistent**: Follow the patterns established by existing message types

---

## Related Files

- [src/types/index.ts](../src/types/index.ts) - Core type definitions
- [src/types/schemas.ts](../src/types/schemas.ts) - Zod validation schemas
- [src/types/messageConfig.ts](../src/types/messageConfig.ts) - Message type metadata
- [src/types/helpers.ts](../src/types/helpers.ts) - Helper functions
- [src/tools/definitions.ts](../src/tools/definitions.ts) - Tool implementations
- [message-type-template.ts](./message-type-template.ts) - Quick-start template

---

## Need Help?

If you encounter issues:
1. Check the console logs for validation errors
2. Review existing message types for reference
3. Ensure all 5 steps are completed
4. Test each component individually

For architecture questions, refer to the main README.
