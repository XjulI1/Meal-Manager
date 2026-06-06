import type {
  ChatMessage,
  IRecipeChatAssistant,
  RecipeChatEvent,
} from '../../domain/ports/recipe-chat-assistant'

export interface ChatRecipeInput {
  householdId: string
  messages: ReadonlyArray<ChatMessage>
}

/**
 * Orchestrates one conversational turn with the recipe assistant. The turn is
 * stateless server-side (the full history is supplied each call). Returns the
 * stream of assistant events; persistence never happens here.
 */
export class ChatRecipeUseCase {
  constructor(private readonly assistant: IRecipeChatAssistant) {}

  stream(input: ChatRecipeInput): AsyncIterable<RecipeChatEvent> {
    // householdId is reserved for scoping/auditing; the LLM turn itself does
    // not need it (no household data is sent to the model).
    return this.assistant.streamTurn(input.messages)
  }
}

export type { ChatMessage, RecipeChatEvent }
