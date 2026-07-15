import { beforeEach, describe, expect, it } from 'vitest'
import { CreateWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/create-wine.use-case'
import { ListWinesUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/list-wines.use-case'
import { FakeLabelPhotoStorage } from './in-memory/fake-label-photo-storage'
import { InMemoryBottleRepository } from './in-memory/in-memory-bottle.repository'
import { InMemoryWineRepository } from './in-memory/in-memory-wine.repository'

const HH = 'hh-1'
const now = () => new Date('2026-07-14T10:00:00Z')

describe('ListWinesUseCase filtering & sorting', () => {
  let wines: InMemoryWineRepository
  let bottles: InMemoryBottleRepository
  let createWine: CreateWineUseCase
  let listWines: ListWinesUseCase
  let n: number

  beforeEach(async () => {
    wines = new InMemoryWineRepository()
    bottles = new InMemoryBottleRepository()
    n = 0
    createWine = new CreateWineUseCase(wines, new FakeLabelPhotoStorage(), () => `id-${++n}`, now)
    listWines = new ListWinesUseCase(wines, bottles)

    await createWine.execute({ householdId: HH, name: 'Chablis', color: 'blanc', region: 'bourgogne', domain: 'Domaine Laroche', vintage: 2020 })
    await createWine.execute({ householdId: HH, name: 'Margaux', color: 'rouge', region: 'bordeaux', domain: 'Château Margaux', vintage: 2015 })
    await createWine.execute({ householdId: HH, name: 'Pomerol', color: 'rouge', region: 'bordeaux', domain: 'Petrus', vintage: 2018 })
  })

  it('returns all wines sorted by name by default', async () => {
    const result = await listWines.execute({ householdId: HH })
    expect(result.map((w) => w.name)).toEqual(['Chablis', 'Margaux', 'Pomerol'])
  })

  it('filters by color', async () => {
    const result = await listWines.execute({ householdId: HH, color: 'rouge' })
    expect(result.map((w) => w.name)).toEqual(['Margaux', 'Pomerol'])
  })

  it('filters by region', async () => {
    const result = await listWines.execute({ householdId: HH, region: 'bordeaux' })
    expect(result.map((w) => w.name)).toEqual(['Margaux', 'Pomerol'])
  })

  it('filters by domain (case-insensitive substring)', async () => {
    const result = await listWines.execute({ householdId: HH, domain: 'château' })
    expect(result.map((w) => w.name)).toEqual(['Margaux'])
  })

  it('sorts by vintage ascending', async () => {
    const result = await listWines.execute({ householdId: HH, sort: 'vintage' })
    expect(result.map((w) => w.vintage)).toEqual([2015, 2018, 2020])
  })

  it('combines filters', async () => {
    const result = await listWines.execute({ householdId: HH, color: 'rouge', domain: 'petrus' })
    expect(result.map((w) => w.name)).toEqual(['Pomerol'])
  })

  it('global search matches the wine name', async () => {
    const result = await listWines.execute({ householdId: HH, q: 'chablis' })
    expect(result.map((w) => w.name)).toEqual(['Chablis'])
  })

  it('global search matches the domain', async () => {
    const result = await listWines.execute({ householdId: HH, q: 'petrus' })
    expect(result.map((w) => w.name)).toEqual(['Pomerol'])
  })

  it('global search matches the region (accent- and case-insensitive)', async () => {
    const result = await listWines.execute({ householdId: HH, q: 'BORDEAUX' })
    expect(result.map((w) => w.name)).toEqual(['Margaux', 'Pomerol'])
  })

  it('global search matches the vintage', async () => {
    const result = await listWines.execute({ householdId: HH, q: '2015' })
    expect(result.map((w) => w.name)).toEqual(['Margaux'])
  })

  it('global search is accent-insensitive on the wine name', async () => {
    const result = await listWines.execute({ householdId: HH, q: 'chateau' })
    expect(result.map((w) => w.name)).toEqual(['Margaux'])
  })
})
