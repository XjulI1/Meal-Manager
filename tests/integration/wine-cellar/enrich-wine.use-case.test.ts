import { beforeEach, describe, expect, it } from 'vitest'
import { CreateWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/create-wine.use-case'
import { EnrichWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/enrich-wine.use-case'
import { WineNotFoundError } from '../../../server/contexts/wine-cellar/domain/errors/wine-not-found.error'
import { WineEnrichmentError } from '../../../server/contexts/wine-cellar/domain/errors/wine-enrichment.error'
import { FakeLabelPhotoStorage } from './in-memory/fake-label-photo-storage'
import { FakeWineEnricher } from './in-memory/fake-wine-enricher'
import { InMemoryBottleRepository } from './in-memory/in-memory-bottle.repository'
import { InMemoryWineRepository } from './in-memory/in-memory-wine.repository'

const HH = 'hh-1'
const OTHER = 'hh-2'
const now = () => new Date('2026-07-15T10:00:00Z')

describe('EnrichWineUseCase', () => {
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

  async function seedWine(overrides: { gardeMin?: number, gardeMax?: number } = {}) {
    return createWine.execute({
      householdId: HH,
      name: 'Saint-Amour',
      color: 'rouge',
      region: 'beaujolais',
      vintage: 2022,
      ...overrides,
    })
  }

  it('persists the researched fields and stamps aiEnrichedAt', async () => {
    const created = await seedWine()
    const enricher = new FakeWineEnricher({
      gardeMin: 2025,
      gardeMax: 2032,
      aromas: 'fruits rouges, épices',
      foodPairings: 'viandes rouges grillées',
    })
    const useCase = new EnrichWineUseCase(wines, bottles, enricher, now)

    const result = await useCase.execute({ householdId: HH, id: created.id })

    expect(result.gardeMin).toBe(2025)
    expect(result.gardeMax).toBe(2032)
    expect(result.aromas).toBe('fruits rouges, épices')
    expect(result.foodPairings).toBe('viandes rouges grillées')
    expect(result.aiEnrichedAt).toBe(now().toISOString())
    // The enricher receives the wine's known facts.
    expect(enricher.lastFacts).toMatchObject({ name: 'Saint-Amour', region: 'beaujolais', vintage: 2022 })
  })

  it('rejects a wine from another household with 404 and never calls the enricher', async () => {
    const created = await seedWine()
    const enricher = new FakeWineEnricher({ aromas: 'x' })
    const useCase = new EnrichWineUseCase(wines, bottles, enricher, now)

    await expect(
      useCase.execute({ householdId: OTHER, id: created.id }),
    ).rejects.toBeInstanceOf(WineNotFoundError)
    expect(enricher.lastFacts).toBeUndefined()
  })

  it('leaves a field unchanged when the research does not return it', async () => {
    const created = await seedWine({ gardeMin: 2024, gardeMax: 2030 })
    const enricher = new FakeWineEnricher({ aromas: 'minéral' })
    const useCase = new EnrichWineUseCase(wines, bottles, enricher, now)

    const result = await useCase.execute({ householdId: HH, id: created.id })

    // garde window untouched (not returned by the research)…
    expect(result.gardeMin).toBe(2024)
    expect(result.gardeMax).toBe(2030)
    // …only the returned field is written.
    expect(result.aromas).toBe('minéral')
    expect(result.foodPairings).toBeNull()
  })

  it('re-enrichment overwrites returned fields and refreshes aiEnrichedAt', async () => {
    const created = await seedWine()
    const first = new EnrichWineUseCase(wines, bottles, new FakeWineEnricher({ aromas: 'v1' }), now)
    await first.execute({ householdId: HH, id: created.id })

    const later = () => new Date('2026-08-01T10:00:00Z')
    const second = new EnrichWineUseCase(wines, bottles, new FakeWineEnricher({ aromas: 'v2' }), later)
    const result = await second.execute({ householdId: HH, id: created.id })

    expect(result.aromas).toBe('v2')
    expect(result.aiEnrichedAt).toBe(later().toISOString())
  })

  it('neutralizes an incoherent garde window (keeps the existing one)', async () => {
    const created = await seedWine({ gardeMin: 2024, gardeMax: 2030 })
    const enricher = new FakeWineEnricher({ gardeMin: 2035, gardeMax: 2020, aromas: 'cuir' })
    const useCase = new EnrichWineUseCase(wines, bottles, enricher, now)

    const result = await useCase.execute({ householdId: HH, id: created.id })

    // Incoherent min>max dropped → existing window preserved.
    expect(result.gardeMin).toBe(2024)
    expect(result.gardeMax).toBe(2030)
    // Other fields still applied.
    expect(result.aromas).toBe('cuir')
  })

  it('propagates a WineEnrichmentError when the enricher fails', async () => {
    const created = await seedWine()
    const useCase = new EnrichWineUseCase(
      wines,
      bottles,
      new FakeWineEnricher(new WineEnrichmentError('upstream down')),
      now,
    )
    await expect(
      useCase.execute({ householdId: HH, id: created.id }),
    ).rejects.toBeInstanceOf(WineEnrichmentError)
  })
})
