import type { RecipeDraft } from './recipe-importer'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RecipeChatSource {
  title?: string
  url: string
}

/** Streamed events produced during one assistant turn. */
export type RecipeChatEvent =
  | { type: 'text', text: string }
  | { type: 'sources', sources: ReadonlyArray<RecipeChatSource> }
  | { type: 'draft', draft: RecipeDraft }

/**
 * Port for the conversational recipe assistant. The domain declares the
 * contract; an infrastructure adapter implements it against the Anthropic
 * Messages API. The assistant NEVER persists anything — it streams text
 * (optionally citing web sources) and, when a recipe is ready, emits a
 * structured RecipeDraft for the user to review in the recipe form.
 */
export interface IRecipeChatAssistant {
  streamTurn(messages: ReadonlyArray<ChatMessage>): AsyncIterable<RecipeChatEvent>
}
