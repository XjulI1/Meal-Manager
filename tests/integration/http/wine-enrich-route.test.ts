import { describe, expect, it, vi } from 'vitest'
import enrichHandler from '../../../server/api/cave/wines/[id]/enrich.post'
import { WineNotFoundError } from '../../../server/contexts/wine-cellar/domain/errors/wine-not-found.error'
import { WineEnrichmentError } from '../../../server/contexts/wine-cellar/domain/errors/wine-enrichment.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com' } }
const HH = 'hh-1'
const WINE = '00000000-0000-4000-8000-0000000000cc'

function buildContainer(aiEnabled = true, overrides: Record<string, { execute: ReturnType<typeof vi.fn> }> = {}) {
  return {
    getCurrentHousehold: { execute: vi.fn().mockResolvedValue({ id: HH, name: 'Foyer', inviteCode: 'X', memberCount: 1 }) },
    getUserAiAccess: { execute: vi.fn().mockResolvedValue({ aiEnabled }) },
    enrichWine: { execute: vi.fn() },
    ...overrides,
  }
}

describe('POST /api/cave/wines/[id]/enrich', () => {
  it('returns the enriched wine view', async () => {
    const container = buildContainer()
    container.enrichWine.execute.mockResolvedValue({ id: WINE, name: 'Saint-Amour', aromas: 'fruits rouges', aiEnrichedAt: '2026-07-15T10:00:00.000Z' })
    const event = makeEvent({ session, container, params: { id: WINE } })

    const result = await (enrichHandler as any)(event)

    expect(result).toMatchObject({ id: WINE, aromas: 'fruits rouges' })
    expect(container.enrichWine.execute).toHaveBeenCalledWith({ householdId: HH, id: WINE })
  })

  it('returns 403 when AI is disabled and never enriches', async () => {
    const container = buildContainer(false)
    const event = makeEvent({ session, container, params: { id: WINE } })

    await expect((enrichHandler as any)(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(container.enrichWine.execute).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown wine', async () => {
    const container = buildContainer()
    container.enrichWine.execute.mockRejectedValue(new WineNotFoundError(WINE))
    const event = makeEvent({ session, container, params: { id: WINE } })

    await expect((enrichHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 502 when the enrichment fails upstream', async () => {
    const container = buildContainer()
    container.enrichWine.execute.mockRejectedValue(new WineEnrichmentError('upstream down'))
    const event = makeEvent({ session, container, params: { id: WINE } })

    await expect((enrichHandler as any)(event)).rejects.toMatchObject({ statusCode: 502 })
  })
})
