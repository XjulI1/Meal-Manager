import { describe, expect, it } from 'vitest'
import { ChatRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/chat-recipe.use-case'
import type { RecipeChatEvent } from '../../../server/contexts/catalog/domain/ports/recipe-chat-assistant'
import { FakeRecipeChatAssistant } from './in-memory/fake-recipe-chat-assistant'

describe('ChatRecipeUseCase', () => {
  it('streams the assistant events and forwards the message history', async () => {
    const events: RecipeChatEvent[] = [
      { type: 'text', text: 'Bonjour' },
      { type: 'sources', sources: [{ url: 'https://example.com/r', title: 'Recette' }] },
      { type: 'draft', draft: { title: 'Tarte', instructions: 'Cuire', ingredients: [{ name: 'Pommes' }] } },
    ]
    const assistant = new FakeRecipeChatAssistant(events)
    const useCase = new ChatRecipeUseCase(assistant)

    const received: RecipeChatEvent[] = []
    for await (const ev of useCase.stream({ householdId: 'hh-1', messages: [{ role: 'user', content: 'salut' }] })) {
      received.push(ev)
    }

    expect(received).toEqual(events)
    expect(assistant.lastMessages).toEqual([{ role: 'user', content: 'salut' }])
  })

  it('never persists — it only relays events', async () => {
    const assistant = new FakeRecipeChatAssistant([{ type: 'text', text: 'ok' }])
    const useCase = new ChatRecipeUseCase(assistant)
    const out: RecipeChatEvent[] = []
    for await (const ev of useCase.stream({ householdId: 'hh-1', messages: [{ role: 'user', content: 'x' }] })) {
      out.push(ev)
    }
    expect(out).toEqual([{ type: 'text', text: 'ok' }])
  })
})
