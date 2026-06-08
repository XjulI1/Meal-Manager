import { describe, expect, it, vi } from 'vitest'
import chatHandler from '../../../server/api/recipes/chat.post'
import importHandler from '../../../server/api/recipes/import.post'
import resolveHandler from '../../../server/api/recipes/draft/resolve.post'
import { RecipeImportError } from '../../../server/contexts/catalog/domain/errors/recipe-import.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com', aiEnabled: true } }
const HH = 'hh-1'

interface StubUseCase { execute: ReturnType<typeof vi.fn> }

function buildContainer(opts: { aiEnabled?: boolean, overrides?: Record<string, StubUseCase> } = {}) {
  const aiEnabled = opts.aiEnabled ?? true
  return {
    getCurrentHousehold: { execute: vi.fn().mockResolvedValue({ id: HH, name: 'Famille', inviteCode: 'X', memberCount: 1 }) },
    getUserAiAccess: { execute: vi.fn().mockResolvedValue({ aiEnabled }) },
    importRecipeFromUrl: { execute: vi.fn() },
    resolveRecipeDraft: { execute: vi.fn() },
    chatRecipe: { stream: vi.fn() },
    ...opts.overrides,
  }
}

describe('POST /api/recipes/import (gating)', () => {
  it('returns 401 when there is no session', async () => {
    const event = makeEvent({ container: buildContainer(), body: { url: 'https://example.com/r' } })
    await expect((importHandler as any)(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 403 when AI is disabled for the account', async () => {
    const event = makeEvent({ session, container: buildContainer({ aiEnabled: false }), body: { url: 'https://example.com/r' } })
    await expect((importHandler as any)(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns the imported draft when AI is enabled', async () => {
    const draft = { title: 'Tarte', instructions: 'Cuire', ingredients: [{ name: 'Pommes' }], sourceUrl: 'https://example.com/r' }
    const container = buildContainer()
    container.importRecipeFromUrl.execute.mockResolvedValue(draft)
    const event = makeEvent({ session, container, body: { url: 'https://example.com/r' } })

    const result = await (importHandler as any)(event)

    expect(result).toEqual(draft)
    expect(container.importRecipeFromUrl.execute).toHaveBeenCalledWith({ householdId: HH, url: 'https://example.com/r' })
  })

  it('maps a RecipeImportError to 400', async () => {
    const container = buildContainer()
    container.importRecipeFromUrl.execute.mockRejectedValue(new RecipeImportError('unreachable'))
    const event = makeEvent({ session, container, body: { url: 'https://example.com/r' } })
    await expect((importHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 400 on an invalid body (missing url)', async () => {
    const event = makeEvent({ session, container: buildContainer(), body: {} })
    await expect((importHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('POST /api/recipes/draft/resolve', () => {
  it('returns the resolution when AI is enabled', async () => {
    const resolution = { title: 'X', instructions: 'Y', ingredients: [] }
    const container = buildContainer()
    container.resolveRecipeDraft.execute.mockResolvedValue(resolution)
    const event = makeEvent({
      session,
      container,
      body: { draft: { title: 'X', instructions: 'Y', ingredients: [] } },
    })

    const result = await (resolveHandler as any)(event)

    expect(result).toEqual(resolution)
    expect(container.resolveRecipeDraft.execute).toHaveBeenCalledWith({
      householdId: HH,
      draft: { title: 'X', instructions: 'Y', ingredients: [] },
    })
  })

  it('returns 403 when AI is disabled', async () => {
    const event = makeEvent({
      session,
      container: buildContainer({ aiEnabled: false }),
      body: { draft: { title: 'X', instructions: 'Y', ingredients: [] } },
    })
    await expect((resolveHandler as any)(event)).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('POST /api/recipes/chat (gating)', () => {
  it('returns 401 when there is no session', async () => {
    const event = makeEvent({ container: buildContainer(), body: { messages: [{ role: 'user', content: 'hi' }] } })
    await expect((chatHandler as any)(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 403 when AI is disabled (before any model call)', async () => {
    const container = buildContainer({ aiEnabled: false })
    const event = makeEvent({ session, container, body: { messages: [{ role: 'user', content: 'hi' }] } })
    await expect((chatHandler as any)(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(container.chatRecipe.stream).not.toHaveBeenCalled()
  })
})
