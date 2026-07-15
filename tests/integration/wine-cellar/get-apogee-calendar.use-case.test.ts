import { beforeEach, describe, expect, it } from 'vitest'
import { AddBottlesUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/add-bottles.use-case'
import { CreateWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/create-wine.use-case'
import { ExitBottleUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/exit-bottle.use-case'
import { GetApogeeCalendarUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/get-apogee-calendar.use-case'
import { FakeLabelPhotoStorage } from './in-memory/fake-label-photo-storage'
import { InMemoryBottleRepository } from './in-memory/in-memory-bottle.repository'
import { InMemoryWineRepository } from './in-memory/in-memory-wine.repository'

const HH = 'hh-1'
const OTHER_HH = 'hh-2'
const now = () => new Date('2026-07-14T10:00:00Z')
const REF_YEAR = 2026

describe('GetApogeeCalendarUseCase', () => {
  let wines: InMemoryWineRepository
  let bottles: InMemoryBottleRepository
  let createWine: CreateWineUseCase
  let addBottles: AddBottlesUseCase
  let exitBottle: ExitBottleUseCase
  let getCalendar: GetApogeeCalendarUseCase
  let n: number

  const nextId = () => `id-${++n}`

  beforeEach(() => {
    wines = new InMemoryWineRepository()
    bottles = new InMemoryBottleRepository()
    n = 0
    createWine = new CreateWineUseCase(wines, new FakeLabelPhotoStorage(), nextId, now)
    addBottles = new AddBottlesUseCase(wines, bottles, nextId, now)
    exitBottle = new ExitBottleUseCase(bottles)
    getCalendar = new GetApogeeCalendarUseCase(wines, bottles, now)
  })

  it('groups by cuvée with the in-stock bottle count and status', async () => {
    const wine = await createWine.execute({
      householdId: HH, name: 'Margaux', color: 'rouge', gardeMin: 2024, gardeMax: 2030,
    })
    await addBottles.execute({ householdId: HH, wineId: wine.id, quantity: 3 })

    const result = await getCalendar.execute({ householdId: HH })

    expect(result.refYear).toBe(REF_YEAR)
    expect(result.wines).toHaveLength(1)
    expect(result.wines[0]!.wine.name).toBe('Margaux')
    expect(result.wines[0]!.wine.bottleCount).toBe(3)
    expect(result.wines[0]!.status).toBe('au-sommet')
  })

  it('counts only in-stock bottles', async () => {
    const wine = await createWine.execute({ householdId: HH, name: 'Chablis', color: 'blanc' })
    const { bottles: added } = await addBottles.execute({ householdId: HH, wineId: wine.id, quantity: 3 })
    await exitBottle.execute({ householdId: HH, id: added[0]!.id, reason: 'consumed' })

    const result = await getCalendar.execute({ householdId: HH })

    expect(result.wines[0]!.wine.bottleCount).toBe(2)
  })

  it('excludes cuvées with no in-stock bottle', async () => {
    const empty = await createWine.execute({ householdId: HH, name: 'Sans stock', color: 'rouge' })
    const { bottles: added } = await addBottles.execute({ householdId: HH, wineId: empty.id, quantity: 1 })
    await exitBottle.execute({ householdId: HH, id: added[0]!.id, reason: 'consumed' })
    const stocked = await createWine.execute({ householdId: HH, name: 'En stock', color: 'rouge' })
    await addBottles.execute({ householdId: HH, wineId: stocked.id, quantity: 1 })

    const result = await getCalendar.execute({ householdId: HH })

    expect(result.wines.map((w) => w.wine.name)).toEqual(['En stock'])
  })

  it('classifies statuses relative to the reference year', async () => {
    const past = await createWine.execute({ householdId: HH, name: 'Dépassé', color: 'rouge', gardeMin: 2015, gardeMax: 2022 })
    const future = await createWine.execute({ householdId: HH, name: 'À venir', color: 'rouge', gardeMin: 2030, gardeMax: 2040 })
    const start = await createWine.execute({ householdId: HH, name: 'Début', color: 'rouge', gardeMin: 2026, gardeMax: 2032 })
    const core = await createWine.execute({ householdId: HH, name: 'Sommet', color: 'rouge', gardeMin: 2020, gardeMax: 2030 })
    const closing = await createWine.execute({ householdId: HH, name: 'Fin', color: 'rouge', gardeMin: 2020, gardeMax: 2026 })
    const unknown = await createWine.execute({ householdId: HH, name: 'Inconnu', color: 'rouge' })
    for (const w of [past, future, start, core, closing, unknown]) {
      await addBottles.execute({ householdId: HH, wineId: w.id, quantity: 1 })
    }

    const result = await getCalendar.execute({ householdId: HH })
    const byName = new Map(result.wines.map((w) => [w.wine.name, w.status]))

    expect(byName.get('Dépassé')).toBe('depasse')
    expect(byName.get('À venir')).toBe('a-venir')
    expect(byName.get('Début')).toBe('debut-apogee')
    expect(byName.get('Sommet')).toBe('au-sommet')
    expect(byName.get('Fin')).toBe('fin-apogee')
    expect(byName.get('Inconnu')).toBe('garde-non-renseignee')
  })

  it('respects an explicit reference year', async () => {
    const wine = await createWine.execute({ householdId: HH, name: 'Garde', color: 'rouge', gardeMin: 2024, gardeMax: 2030 })
    await addBottles.execute({ householdId: HH, wineId: wine.id, quantity: 1 })

    const result = await getCalendar.execute({ householdId: HH, refYear: 2035 })

    expect(result.refYear).toBe(2035)
    expect(result.wines[0]!.status).toBe('depasse')
  })

  it('isolates households', async () => {
    const mine = await createWine.execute({ householdId: HH, name: 'Mien', color: 'rouge' })
    await addBottles.execute({ householdId: HH, wineId: mine.id, quantity: 1 })
    const theirs = await createWine.execute({ householdId: OTHER_HH, name: 'Autre', color: 'rouge' })
    await addBottles.execute({ householdId: OTHER_HH, wineId: theirs.id, quantity: 1 })

    const result = await getCalendar.execute({ householdId: HH })

    expect(result.wines.map((w) => w.wine.name)).toEqual(['Mien'])
  })
})
