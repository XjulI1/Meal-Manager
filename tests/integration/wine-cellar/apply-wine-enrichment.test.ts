import { beforeEach, describe, expect, it } from 'vitest'
import { CreateWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/create-wine.use-case'
import { EnrichWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/enrich-wine.use-case'
import { SaveWineEnrichmentUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/save-wine-enrichment.use-case'
import type { WineEnrichmentResult } from '../../../server/contexts/wine-cellar/domain/ports/wine-enricher.port'
import { FakeLabelPhotoStorage } from './in-memory/fake-label-photo-storage'
import { FakeWineEnricher } from './in-memory/fake-wine-enricher'
import { InMemoryBottleRepository } from './in-memory/in-memory-bottle.repository'
import { InMemoryWineRepository } from './in-memory/in-memory-wine.repository'

const HH = 'hh-1'
const now = () => new Date('2026-07-15T10:00:00Z')

/**
 * DRY guarantee: the in-app path (AI research) and the supplied-values path
 * (MCP) share `applyWineEnrichment`, so for the SAME result they MUST persist
 * the SAME wine state — including the tricky rules (incoherent garde dropped,
 * omitted field unchanged).
 */
describe('applyWineEnrichment shared by both paths', () => {
  let wines: InMemoryWineRepository
  let bottles: InMemoryBottleRepository
  let createWine: CreateWineUseCase
  let n: number

  beforeEach(() => {
    wines = new InMemoryWineRepository()
    bottles = new InMemoryBottleRepository()
    n = 0
    createWine = new CreateWineUseCase(wines, new FakeLabelPhotoStorage(), () => `id-${++n}`, now)
  })

  it('produces identical state whether researched (app) or supplied (MCP)', async () => {
    const result: WineEnrichmentResult = { gardeMin: 2035, gardeMax: 2020, aromas: 'cuir' } // incoherent garde + omitted foodPairings

    const a = await createWine.execute({ householdId: HH, name: 'A', color: 'rouge', gardeMin: 2024, gardeMax: 2030 })
    const b = await createWine.execute({ householdId: HH, name: 'B', color: 'rouge', gardeMin: 2024, gardeMax: 2030 })

    const viaApp = await new EnrichWineUseCase(wines, bottles, new FakeWineEnricher(result), now)
      .execute({ householdId: HH, id: a.id })
    const viaMcp = await new SaveWineEnrichmentUseCase(wines, bottles, now)
      .execute({ householdId: HH, id: b.id, enrichment: result })

    const pick = (w: typeof viaApp) => ({
      gardeMin: w.gardeMin, gardeMax: w.gardeMax, aromas: w.aromas, foodPairings: w.foodPairings, aiEnrichedAt: w.aiEnrichedAt,
    })
    expect(pick(viaApp)).toEqual(pick(viaMcp))
    // And the rules actually fired: incoherent garde dropped, foodPairings untouched.
    expect(viaMcp.gardeMin).toBe(2024)
    expect(viaMcp.gardeMax).toBe(2030)
    expect(viaMcp.foodPairings).toBeNull()
  })
})
