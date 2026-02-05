import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  conversationLanguage: Annotation<string>({
    reducer: (_, update) => update,
    default: () => 'en-GB',
  }),
  conversationId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  responseMessage: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});

export type GraphStateType = typeof GraphState.State;
