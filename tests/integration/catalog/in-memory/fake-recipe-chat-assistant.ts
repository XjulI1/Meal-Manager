import type {
  ChatMessage,
  IRecipeChatAssistant,
  RecipeChatEvent,
} from '../../../../server/contexts/catalog/domain/ports/recipe-chat-assistant'

/** In-memory fake that replays a fixed sequence of events. No network. */
export class FakeRecipeChatAssistant implements IRecipeChatAssistant {
  lastMessages: ReadonlyArray<ChatMessage> = []

  constructor(private readonly events: RecipeChatEvent[] = []) {}

  async *streamTurn(messages: ReadonlyArray<ChatMessage>): AsyncIterable<RecipeChatEvent> {
    this.lastMessages = messages
    for (const ev of this.events) {
      yield ev
    }
  }
}
