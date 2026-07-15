import { beforeEach, describe, expect, it } from 'vitest'
import { CreateWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/create-wine.use-case'
import { SaveWineEnrichmentUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/save-wine-enrichment.use-case'
import { WineNotFoundError } from '../../../server/contexts/wine-cellar/domain/errors/wine-not-found.error'
import { FakeLabelPhotoStorage } from './in-memory/fake-label-photo-storage'
import { InMemoryBottleRepository } from './in-memory/in-memory-bottle.repository'
import { InMemoryWineRepository } from './in-memory/in-memory-wine.repository'

const HH = 'hh-1'
const OTHER = 'hh-2'
const now = () => new Date('2026-07-15T10:00:00Z')

describe('SaveWineEnrichmentUseCase', () => {
  let wines: InMemoryWineRepository
  let bottles: InMemoryBottleRepository
  let createWine: CreateWineUseCase
  let save: SaveWineEnrichmentUseCase
  let n: number

  beforeEach(() => {
    wines = new InMemoryWineRepository()
    bottles = new InMemoryBottleRepository()
    n = 0
    createWine = new CreateWineUseCase(wines, new FakeLabelPhotoStorage(), () => `id-${++n}`, now)
    save = new SaveWineEnrichmentUseCase(wines, bottles, now)
  })

  const seed = (o: { gardeMin?: number, gardeMax?: number } = {}) =>
    createWine.execute({ householdId: HH, name: 'Saint-Amour', color: 'rouge', region: 'beaujolais', vintage: 2022, ...o })

  it('persists supplied values and stamps aiEnrichedAt, no AI call', async () => {
    const created = await seed()
    const result = await save.execute({
      householdId: HH,
      id: created.id,
      enrichment: { gardeMin: 2025, gardeMax: 2032, aromas: 'fruits rouges', foodPairings: 'grillades' },
    })

    expect(result.gardeMin).toBe(2025)
    expect(result.gardeMax).toBe(2032)
    expect(result.aromas).toBe('fruits rouges')
    expect(result.foodPairings).toBe('grillades')
    expect(result.aiEnrichedAt).toBe(now().toISOString())
  })

  it('rejects a wine from another household with 404', async () => {
    const created = await seed()
    await expect(
      save.execute({ householdId: OTHER, id: created.id, enrichment: { aromas: 'x' } }),
    ).rejects.toBeInstanceOf(WineNotFoundError)
  })

  it('leaves an omitted field unchanged', async () => {
    const created = await seed({ gardeMin: 2024, gardeMax: 2030 })
    const result = await save.execute({ householdId: HH, id: created.id, enrichment: { aromas: 'minéral' } })
    expect(result.gardeMin).toBe(2024)
    expect(result.gardeMax).toBe(2030)
    expect(result.aromas).toBe('minéral')
  })

  it('re-enrichment overwrites and refreshes aiEnrichedAt', async () => {
    const created = await seed()
    await save.execute({ householdId: HH, id: created.id, enrichment: { aromas: 'v1' } })

    const later = () => new Date('2026-08-01T10:00:00Z')
    const save2 = new SaveWineEnrichmentUseCase(wines, bottles, later)
    const result = await save2.execute({ householdId: HH, id: created.id, enrichment: { aromas: 'v2' } })

    expect(result.aromas).toBe('v2')
    expect(result.aiEnrichedAt).toBe(later().toISOString())
  })

  it('neutralizes an incoherent garde window', async () => {
    const created = await seed({ gardeMin: 2024, gardeMax: 2030 })
    const result = await save.execute({
      householdId: HH,
      id: created.id,
      enrichment: { gardeMin: 2035, gardeMax: 2020, aromas: 'cuir' },
    })
    expect(result.gardeMin).toBe(2024)
    expect(result.gardeMax).toBe(2030)
    expect(result.aromas).toBe('cuir')
  })
})
