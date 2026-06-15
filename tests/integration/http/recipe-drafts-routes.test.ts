import { describe, expect, it, vi } from 'vitest'
import draftCreateHandler from '../../../server/api/recipes/drafts/index.post'
import draftListHandler from '../../../server/api/recipes/drafts/index.get'
import draftGetHandler from '../../../server/api/recipes/drafts/[id].get'
import draftPatchHandler from '../../../server/api/recipes/drafts/[id].patch'
import draftDeleteHandler from '../../../server/api/recipes/drafts/[id].delete'
import { RecipeDraftLimitReachedError } from '../../../server/contexts/catalog/domain/errors/recipe-draft-limit-reached.error'
import { RecipeDraftNotFoundError } from '../../../server/contexts/catalog/domain/errors/recipe-draft-not-found.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com', aiEnabled: true } }
const HH = 'hh-1'

function buildContainer(overrides: Record<string, { execute: ReturnType<typeof vi.fn> }> = {}) {
  return {
    getCurrentHousehold: { execute: vi.fn().mockResolvedValue({ id: HH, name: 'Famille', inviteCode: 'X', memberCount: 1 }) },
    saveRecipeDraft: { execute: vi.fn() },
    listRecipeDrafts: { execute: vi.fn() },
    getRecipeDraftById: { execute: vi.fn() },
    updateRecipeDraft: { execute: vi.fn() },
    deleteRecipeDraft: { execute: vi.fn() },
    ...overrides,
  }
}

describe('POST /api/recipes/drafts', () => {
  it('401 without a session', async () => {
    const event = makeEvent({ container: buildContainer(), body: { source: 'manual', title: 'A' } })
    await expect((draftCreateHandler as any)(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('400 on an unknown source', async () => {
    const event = makeEvent({ session, container: buildContainer(), body: { source: 'imported' } })
    await expect((draftCreateHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('creates a draft (201) and forwards source + content to the use case', async () => {
    const container = buildContainer()
    container.saveRecipeDraft.execute.mockResolvedValue({ id: 'draft-1', source: 'manual' })
    const event = makeEvent({
      session,
      container,
      body: { source: 'manual', title: 'Tarte', ingredients: [{ name: 'pommes' }] },
    })

    const result = await (draftCreateHandler as any)(event)

    expect(result).toMatchObject({ id: 'draft-1' })
    expect(container.saveRecipeDraft.execute).toHaveBeenCalledWith({
      householdId: HH,
      source: 'manual',
      content: { title: 'Tarte', ingredients: [{ name: 'pommes' }] },
    })
    expect(event._status).toBe(201)
  })

  it('409 when the per-household cap is reached', async () => {
    const container = buildContainer()
    container.saveRecipeDraft.execute.mockRejectedValue(new RecipeDraftLimitReachedError())
    const event = makeEvent({ session, container, body: { source: 'manual' } })
    await expect((draftCreateHandler as any)(event)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('GET /api/recipes/drafts', () => {
  it('returns the household drafts', async () => {
    const container = buildContainer()
    container.listRecipeDrafts.execute.mockResolvedValue([{ id: 'draft-1' }])
    const event = makeEvent({ session, container })
    await expect((draftListHandler as any)(event)).resolves.toEqual([{ id: 'draft-1' }])
    expect(container.listRecipeDrafts.execute).toHaveBeenCalledWith({ householdId: HH })
  })
})

describe('GET /api/recipes/drafts/:id', () => {
  it('404 when the draft is not in the household', async () => {
    const container = buildContainer()
    container.getRecipeDraftById.execute.mockRejectedValue(new RecipeDraftNotFoundError('draft-x'))
    const event = makeEvent({ session, container, params: { id: 'draft-x' } })
    await expect((draftGetHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('PATCH /api/recipes/drafts/:id', () => {
  it('forwards the content patch and 404s across households', async () => {
    const container = buildContainer()
    container.updateRecipeDraft.execute.mockRejectedValue(new RecipeDraftNotFoundError('draft-x'))
    const event = makeEvent({ session, container, params: { id: 'draft-x' }, body: { title: 'B' } })
    await expect((draftPatchHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
    expect(container.updateRecipeDraft.execute).toHaveBeenCalledWith({
      householdId: HH,
      id: 'draft-x',
      content: { title: 'B' },
    })
  })
})

describe('DELETE /api/recipes/drafts/:id', () => {
  it('deletes (204) and 404s across households', async () => {
    const container = buildContainer()
    container.deleteRecipeDraft.execute.mockResolvedValue(undefined)
    const event = makeEvent({ session, container, params: { id: 'draft-1' } })
    await (draftDeleteHandler as any)(event)
    expect(container.deleteRecipeDraft.execute).toHaveBeenCalledWith({ householdId: HH, id: 'draft-1' })
    expect(event._status).toBe(204)

    const container2 = buildContainer()
    container2.deleteRecipeDraft.execute.mockRejectedValue(new RecipeDraftNotFoundError('draft-x'))
    const event2 = makeEvent({ session, container: container2, params: { id: 'draft-x' } })
    await expect((draftDeleteHandler as any)(event2)).rejects.toMatchObject({ statusCode: 404 })
  })
})
