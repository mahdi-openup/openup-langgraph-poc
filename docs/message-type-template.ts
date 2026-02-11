/**
 * Message Type Template
 *
 * Quick-start template for adding a new message type.
 * Copy-paste the relevant sections and customize for your needs.
 *
 * Replace all instances of:
 * - my_new_type → your message type identifier
 * - MyNewType → your type name in PascalCase
 * - My New Type → human-readable display name
 */

// ============================================
// 1. TYPE DEFINITION (src/types/index.ts)
// ============================================

export type MessageType =
  | 'text'
  | 'emergency'
  // ... other types
  | 'my_new_type'; // ADD YOUR TYPE HERE

export interface MyNewTypePayload {
  // TODO: Define your payload structure
  id: string;
  title: string;
  data: Array<{
    // Your data structure
  }>;
  metadata?: Record<string, unknown>;
}

export interface MessagePayloadMap {
  text: null;
  emergency: EmergencyPayload;
  // ... other payloads
  my_new_type: MyNewTypePayload; // ADD YOUR PAYLOAD MAPPING
}

// Optional: Create type alias for convenience
export type MyNewTypeMessage = StructuredMessage<'my_new_type'>;

// ============================================
// 2. ZOD SCHEMA (src/types/schemas.ts)
// ============================================

import { z } from 'zod';

export const MyNewTypePayloadSchema = z.object({
  // TODO: Match your payload interface exactly
  id: z.string(),
  title: z.string(),
  data: z.array(
    z.object({
      // Your data schema
    })
  ),
  metadata: z.record(z.unknown()).optional(),
});

// Add to PayloadSchemas map
export const PayloadSchemas: Record<MessageType, z.ZodSchema> = {
  // ... other schemas
  my_new_type: MyNewTypePayloadSchema,
};

// ============================================
// 3. MESSAGE CONFIG (src/types/messageConfig.ts)
// ============================================

export const MESSAGE_TYPE_CONFIG: Record<MessageType, MessageTypeConfig> = {
  // ... other configs
  my_new_type: {
    id: 'my_new_type',
    displayName: 'My New Type', // TODO: Set display name
    category: 'content', // TODO: Choose: 'content' | 'booking' | 'emergency' | 'system'
    description: 'Brief description of what this message type represents', // TODO: Add description
    requiresUserAction: false, // TODO: Set to true if user interaction required
    icon: 'icon-name', // TODO: Choose icon name
    metadata: {
      // Optional: Add UI rendering hints
      customProperty: 'value',
    },
  },
};

// ============================================
// 4. STATE EXTRACTION (src/types/helpers.ts)
// ============================================

// Only add this if your message type needs to update graph state
export function extractStateUpdates(result: ToolResult): Record<string, any> {
  const updates: Record<string, any> = {
    responseMessageType: result.messageType,
    responsePayload: result.payload,
    responseMessage: result.textContent,
  };

  switch (result.messageType) {
    // ... other cases

    case 'my_new_type':
      // TODO: Extract state updates from payload if needed
      if (result.payload && 'data' in result.payload) {
        updates.myCustomStateField = result.payload.data;
      }
      break;
  }

  return updates;
}

// ============================================
// 5. TOOL DEFINITION (src/tools/definitions.ts)
// ============================================

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { ToolResult } from '../types/index.js';

export const myNewTool = tool(
  async ({ param1, param2 }): Promise<string> => {
    console.log(`[Tool] myNewTool: ${param1}, ${param2}`);

    // TODO: Implement your tool logic here
    // Example: Fetch data, process it, etc.
    const data = [
      // Your processed data
    ];

    // Create the tool result
    const result: ToolResult<'my_new_type'> = {
      messageType: 'my_new_type',
      payload: {
        id: 'unique_id',
        title: 'Result Title',
        data,
        // Match your payload structure
      },
      textContent: 'Conversational text that accompanies the structured data',
    };

    // Payload is automatically validated against your Zod schema
    return JSON.stringify(result);
  },
  {
    name: 'my_new_tool', // TODO: Choose tool name (snake_case)
    description: 'Describe when the AI orchestrator should use this tool', // TODO: Add description
    schema: z.object({
      // TODO: Define tool parameters
      param1: z.string().describe('Description of what param1 is for'),
      param2: z.string().optional().describe('Optional parameter description'),
    }),
  }
);

// Add to exports
export const allTools = [
  searchContentTool,
  searchExpertsTool,
  getExpertAvailabilityTool,
  bookSessionTool,
  handleContentRequestTool,
  myNewTool, // ADD YOUR TOOL HERE
];

// ============================================
// 6. TESTING
// ============================================

// Test your tool locally
async function testMyNewTool() {
  const result = await myNewTool.invoke({
    param1: 'test value',
    param2: 'optional value',
  });

  console.log('Tool result:', result);

  // Parse and validate
  const parsed = JSON.parse(result);
  console.log('Message type:', parsed.messageType);
  console.log('Payload:', parsed.payload);
  console.log('Text content:', parsed.textContent);
}

// Run: node --loader ts-node/esm test.ts
// testMyNewTool();

// ============================================
// CHECKLIST
// ============================================

/*
  [ ] Added type to MessageType union (src/types/index.ts)
  [ ] Created payload interface (src/types/index.ts)
  [ ] Added to MessagePayloadMap (src/types/index.ts)
  [ ] Created Zod schema (src/types/schemas.ts)
  [ ] Added schema to PayloadSchemas map (src/types/schemas.ts)
  [ ] Added message config (src/types/messageConfig.ts)
  [ ] Updated extractStateUpdates if needed (src/types/helpers.ts)
  [ ] Created tool (src/tools/definitions.ts)
  [ ] Added tool to allTools export (src/tools/definitions.ts)
  [ ] Ran `npm run build` to check for TypeScript errors
  [ ] Tested tool execution
  [ ] Tested /message-types endpoint includes new type
  [ ] Verified frontend can render new message type
*/
