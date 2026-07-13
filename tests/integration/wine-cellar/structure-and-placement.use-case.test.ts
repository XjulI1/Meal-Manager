import { beforeEach, describe, expect, it } from 'vitest'
import { AddBottlesUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/add-bottles.use-case'
import { AddRowUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/add-row.use-case'
import { AddShelfUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/add-shelf.use-case'
import { CreateCellarUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/create-cellar.use-case'
import { CreateWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/create-wine.use-case'
import { DeleteShelfUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/delete-shelf.use-case'
import { RenameShelfUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/rename-shelf.use-case'
import { ExitBottleUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/exit-bottle.use-case'
import { ListBottlesUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/list-bottles.use-case'
import { ListExitJournalUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/list-exit-journal.use-case'
import { PlaceBottleUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/place-bottle.use-case'
import { UpdateRowUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/update-row.use-case'
import { BottleAlreadyExitedError } from '../../../server/contexts/wine-cellar/domain/errors/bottle-already-exited.error'
import { CapacityBelowOccupancyError } from '../../../server/contexts/wine-cellar/domain/errors/capacity-below-occupancy.error'
import { ShelfNotEmptyError } from '../../../server/contexts/wine-cellar/domain/errors/shelf-not-empty.error'
import { SlotOccupiedError } from '../../../server/contexts/wine-cellar/domain/errors/slot-occupied.error'
import { SlotOutOfRangeError } from '../../../server/contexts/wine-cellar/domain/errors/slot-out-of-range.error'
import { InvalidRowCapacityError } from '../../../server/contexts/wine-cellar/domain/entities/row.entity'
import { FakeLabelPhotoStorage } from './in-memory/fake-label-photo-storage'
import { InMemoryBottleRepository } from './in-memory/in-memory-bottle.repository'
import { InMemoryCellarRepository } from './in-memory/in-memory-cellar.repository'
import { InMemoryWineRepository } from './in-memory/in-memory-wine.repository'

const HH = 'hh-1'

describe('wine-cellar structure & placement', () => {
  let cellars: InMemoryCellarRepository
  let wines: InMemoryWineRepository
  let bottles: InMemoryBottleRepository
  let ids: () => string
  const now = () => new Date('2026-07-13T10:00:00Z')

  let createCellar: CreateCellarUseCase
  let addShelf: AddShelfUseCase
  let addRow: AddRowUseCase
  let updateRow: UpdateRowUseCase
  let deleteShelf: DeleteShelfUseCase
  let renameShelf: RenameShelfUseCase
  let createWine: CreateWineUseCase
  let addBottles: AddBottlesUseCase
  let placeBottle: PlaceBottleUseCase
  let exitBottle: ExitBottleUseCase
  let listBottles: ListBottlesUseCase
  let listJournal: ListExitJournalUseCase

  beforeEach(() => {
    cellars = new InMemoryCellarRepository()
    wines = new InMemoryWineRepository()
    bottles = new InMemoryBottleRepository()
    let n = 0
    ids = () => `id-${++n}`

    createCellar = new CreateCellarUseCase(cellars, ids, now)
    addShelf = new AddShelfUseCase(cellars, ids, now)
    addRow = new AddRowUseCase(cellars, ids, now)
    updateRow = new UpdateRowUseCase(cellars, bottles, wines, now)
    deleteShelf = new DeleteShelfUseCase(cellars, bottles)
    renameShelf = new RenameShelfUseCase(cellars, now)
    createWine = new CreateWineUseCase(wines, new FakeLabelPhotoStorage(), ids, now)
    addBottles = new AddBottlesUseCase(wines, bottles, ids, now)
    placeBottle = new PlaceBottleUseCase(bottles, cellars, now)
    exitBottle = new ExitBottleUseCase(bottles, now)
    listBottles = new ListBottlesUseCase(bottles, wines, cellars)
    listJournal = new ListExitJournalUseCase(bottles, wines)
  })

  async function setupRow(capacityBack = 8, capacityFront = 8) {
    const cellar = await createCellar.execute({ householdId: HH, name: 'Cave J.R' })
    const shelf = await addShelf.execute({ householdId: HH, cellarId: cellar.id })
    const row = await addRow.execute({ householdId: HH, shelfId: shelf.id, capacityBack, capacityFront })
    return { cellar, shelf, row }
  }

  async function addWineWithBottles(quantity: number) {
    const wine = await createWine.execute({ householdId: HH, name: 'Saint-Amour', color: 'rouge' })
    const result = await addBottles.execute({ householdId: HH, wineId: wine.id, quantity })
    return { wine, bottles: result.bottles }
  }

  it('creates a cellar with zero shelves and bottles', async () => {
    const cellar = await createCellar.execute({ householdId: HH, name: 'Cave J.R' })
    expect(cellar).toMatchObject({ name: 'Cave J.R', shelfCount: 0, bottleCount: 0 })
  })

  it('adds a row with front and back racks', async () => {
    const { row } = await setupRow(8, 8)
    expect(row.back).toHaveLength(8)
    expect(row.front).toHaveLength(8)
    expect(row.back[0]).toMatchObject({ depth: 'back', index: 1, bottle: null })
  })

  it('rejects a back capacity of zero', async () => {
    const cellar = await createCellar.execute({ householdId: HH, name: 'Cave' })
    const shelf = await addShelf.execute({ householdId: HH, cellarId: cellar.id })
    await expect(addRow.execute({ householdId: HH, shelfId: shelf.id, capacityBack: 0, capacityFront: 0 }))
      .rejects.toBeInstanceOf(InvalidRowCapacityError)
  })

  it('adds unplaced bottles to the pool', async () => {
    await addWineWithBottles(4)
    const list = await listBottles.execute({ householdId: HH, placement: 'unplaced' })
    expect(list).toHaveLength(4)
    expect(list[0]!.bottle.placement).toBeNull()
    expect(list[0]!.bottle.size).toEqual({ value: 750, unit: 'ml' })
  })

  it('places a bottle then rejects a second bottle in the same slot', async () => {
    const { row } = await setupRow()
    const { bottles: created } = await addWineWithBottles(2)

    const placed = await placeBottle.execute({
      householdId: HH,
      bottleId: created[0]!.id,
      position: { rowId: row.id, depth: 'back', index: 2 },
    })
    expect(placed.placement).toMatchObject({ rowId: row.id, depth: 'back', index: 2 })

    await expect(placeBottle.execute({
      householdId: HH,
      bottleId: created[1]!.id,
      position: { rowId: row.id, depth: 'back', index: 2 },
    })).rejects.toBeInstanceOf(SlotOccupiedError)
  })

  it('moves a bottle to another slot and frees the old one', async () => {
    const { row } = await setupRow()
    const { bottles: created } = await addWineWithBottles(1)
    await placeBottle.execute({ householdId: HH, bottleId: created[0]!.id, position: { rowId: row.id, depth: 'back', index: 2 } })
    const moved = await placeBottle.execute({ householdId: HH, bottleId: created[0]!.id, position: { rowId: row.id, depth: 'front', index: 5 } })
    expect(moved.placement).toMatchObject({ depth: 'front', index: 5 })
    // Old slot is now free.
    const second = await addBottles.execute({ householdId: HH, wineId: created[0]!.wineId, quantity: 1 })
    const reuse = await placeBottle.execute({ householdId: HH, bottleId: second.bottles[0]!.id, position: { rowId: row.id, depth: 'back', index: 2 } })
    expect(reuse.placement).toMatchObject({ depth: 'back', index: 2 })
  })

  it('rejects a slot index beyond the capacity', async () => {
    const { row } = await setupRow(8, 8)
    const { bottles: created } = await addWineWithBottles(1)
    await expect(placeBottle.execute({
      householdId: HH,
      bottleId: created[0]!.id,
      position: { rowId: row.id, depth: 'back', index: 9 },
    })).rejects.toBeInstanceOf(SlotOutOfRangeError)
  })

  it('refuses to reduce a capacity below occupancy', async () => {
    const { row } = await setupRow(8, 0)
    const { bottles: created } = await addWineWithBottles(1)
    await placeBottle.execute({ householdId: HH, bottleId: created[0]!.id, position: { rowId: row.id, depth: 'back', index: 6 } })
    await expect(updateRow.execute({ householdId: HH, id: row.id, capacityBack: 5 }))
      .rejects.toBeInstanceOf(CapacityBelowOccupancyError)
  })

  it('takes a bottle out of stock, frees the slot and journals it', async () => {
    const { row } = await setupRow()
    const { bottles: created } = await addWineWithBottles(1)
    await placeBottle.execute({ householdId: HH, bottleId: created[0]!.id, position: { rowId: row.id, depth: 'back', index: 2 } })

    const exited = await exitBottle.execute({
      householdId: HH,
      id: created[0]!.id,
      reason: 'consumed',
      tastingNote: 'Excellent, tanins fondus',
    })
    expect(exited.status).toBe('consumed')
    expect(exited.placement).toBeNull()

    const journal = await listJournal.execute({ householdId: HH })
    expect(journal).toHaveLength(1)
    expect(journal[0]).toMatchObject({
      reason: 'consumed',
      tastingNote: 'Excellent, tanins fondus',
      exitDate: '2026-07-13',
    })

    // The slot is free again and no in-stock bottle remains.
    expect(await listBottles.execute({ householdId: HH })).toHaveLength(0)
  })

  it('rejects a double exit', async () => {
    const { bottles: created } = await addWineWithBottles(1)
    await exitBottle.execute({ householdId: HH, id: created[0]!.id, reason: 'gifted' })
    await expect(exitBottle.execute({ householdId: HH, id: created[0]!.id, reason: 'consumed' }))
      .rejects.toBeInstanceOf(BottleAlreadyExitedError)
  })

  it('renames a shelf and clears the label when blank', async () => {
    const cellar = await createCellar.execute({ householdId: HH, name: 'Cave J.R' })
    const shelf = await addShelf.execute({ householdId: HH, cellarId: cellar.id })

    const renamed = await renameShelf.execute({ householdId: HH, id: shelf.id, label: 'Bourgogne' })
    expect(renamed.label).toBe('Bourgogne')
    expect(cellars.shelves.get(shelf.id)?.label).toBe('Bourgogne')

    const cleared = await renameShelf.execute({ householdId: HH, id: shelf.id, label: null })
    expect(cleared.label).toBeNull()
  })

  it('refuses to delete a shelf that still holds bottles', async () => {
    const { shelf, row } = await setupRow()
    const { bottles: created } = await addWineWithBottles(1)
    await placeBottle.execute({ householdId: HH, bottleId: created[0]!.id, position: { rowId: row.id, depth: 'back', index: 1 } })
    await expect(deleteShelf.execute({ householdId: HH, id: shelf.id }))
      .rejects.toBeInstanceOf(ShelfNotEmptyError)
  })
})
