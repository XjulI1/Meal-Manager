import { beforeEach, describe, expect, it } from 'vitest'
import { InventoryItem } from '../../../server/contexts/inventory/domain/entities/inventory-item.entity'
import { InsufficientQuantityError } from '../../../server/contexts/inventory/domain/errors/insufficient-quantity.error'
import { InvalidIngredientReferenceError } from '../../../server/contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { ItemNotFoundError } from '../../../server/contexts/inventory/domain/errors/item-not-found.error'
import { StorageLocation } from '../../../server/contexts/inventory/domain/value-objects/storage-location.vo'
import { ConsumeInventoryItemByBarcodeUseCase } from '../../../server/contexts/inventory/application/use-cases/consume-inventory-item-by-barcode.use-case'
import { Quantity } from '../../../shared/units/quantity'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryBarcodeResolver } from './in-memory/in-memory-barcode-resolver'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

const HH = 'hh-1'
const BARCODE_PASTA = '3038359002564'
const BARCODE_UNKNOWN = '0000000000017'

function seedLine(
  repo: InMemoryInventoryItemRepository,
  opts: { id: string, ingredientId: string, value: number, location: 'pantry' | 'fridge' | 'freezer', createdAt: Date },
) {
  const item = InventoryItem.create({
    id: opts.id,
    householdId: HH,
    ingredientId: opts.ingredientId,
    quantity: Quantity.fromCanonical(opts.value, 'g'),
    location: StorageLocation.fromString(opts.location),
    now: opts.createdAt,
  })
  return repo.insert(item).then(() => item)
}

describe('ConsumeInventoryItemByBarcodeUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let ingredients: InMemoryIngredientLookup
  let barcodes: InMemoryBarcodeResolver
  let useCase: ConsumeInventoryItemByBarcodeUseCase

  beforeEach(() => {
    repo = new InMemoryInventoryItemRepository()
    ingredients = new InMemoryIngredientLookup()
    barcodes = new InMemoryBarcodeResolver()

    ingredients.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    barcodes.add(HH, BARCODE_PASTA, { name: 'Pâtes Panzani 500g', ingredientId: 'ing-pasta', productId: 'prod-pasta', storage: 'pantry' })

    useCase = new ConsumeInventoryItemByBarcodeUseCase(repo, barcodes, ingredients, () => new Date('2026-05-15T12:00:00Z'))
  })

  it('decrements a single matching line', async () => {
    await seedLine(repo, { id: 'inv-1', ingredientId: 'ing-pasta', value: 500, location: 'pantry', createdAt: new Date('2026-05-01T08:00:00Z') })

    const result = await useCase.execute({
      householdId: HH,
      barcode: BARCODE_PASTA,
      quantity: { value: 200, unit: 'g' },
    })

    expect(result.mode).toBe('normal')
    if (result.mode !== 'normal') return
    expect(result.impactedLines).toEqual([{
      lineId: 'inv-1',
      location: 'pantry',
      quantityRemoved: { value: 200, unit: 'g' },
      remainingQuantity: { value: 300, unit: 'g' },
      deleted: false,
    }])

    const stored = await repo.findById('inv-1', HH)
    expect(stored?.quantity.value).toBe(300)
  })

  it('consumes the default-storage line first, leaving non-default untouched when possible', async () => {
    await seedLine(repo, { id: 'inv-pantry', ingredientId: 'ing-pasta', value: 500, location: 'pantry', createdAt: new Date('2026-05-01T08:00:00Z') })
    await seedLine(repo, { id: 'inv-fridge', ingredientId: 'ing-pasta', value: 300, location: 'fridge', createdAt: new Date('2026-05-02T08:00:00Z') })

    const result = await useCase.execute({
      householdId: HH,
      barcode: BARCODE_PASTA,
      quantity: { value: 200, unit: 'g' },
    })

    if (result.mode !== 'normal') throw new Error('expected normal mode')
    expect(result.impactedLines).toHaveLength(1)
    expect(result.impactedLines[0]).toMatchObject({ lineId: 'inv-pantry', quantityRemoved: { value: 200, unit: 'g' } })

    expect((await repo.findById('inv-pantry', HH))?.quantity.value).toBe(300)
    expect((await repo.findById('inv-fridge', HH))?.quantity.value).toBe(300)
  })

  it('overflows from default to other locations and deletes lines that reach zero', async () => {
    await seedLine(repo, { id: 'inv-pantry', ingredientId: 'ing-pasta', value: 500, location: 'pantry', createdAt: new Date('2026-05-01T08:00:00Z') })
    await seedLine(repo, { id: 'inv-fridge', ingredientId: 'ing-pasta', value: 300, location: 'fridge', createdAt: new Date('2026-05-02T08:00:00Z') })

    const result = await useCase.execute({
      householdId: HH,
      barcode: BARCODE_PASTA,
      quantity: { value: 600, unit: 'g' },
    })

    if (result.mode !== 'normal') throw new Error('expected normal mode')
    expect(result.impactedLines).toEqual([
      { lineId: 'inv-pantry', location: 'pantry', quantityRemoved: { value: 500, unit: 'g' }, remainingQuantity: { value: 0, unit: 'g' }, deleted: true },
      { lineId: 'inv-fridge', location: 'fridge', quantityRemoved: { value: 100, unit: 'g' }, remainingQuantity: { value: 200, unit: 'g' }, deleted: false },
    ])

    expect(await repo.findById('inv-pantry', HH)).toBeNull()
    expect((await repo.findById('inv-fridge', HH))?.quantity.value).toBe(200)
  })

  it('rejects when the total available is below the requested quantity', async () => {
    await seedLine(repo, { id: 'inv-1', ingredientId: 'ing-pasta', value: 100, location: 'pantry', createdAt: new Date() })

    await expect(useCase.execute({
      householdId: HH,
      barcode: BARCODE_PASTA,
      quantity: { value: 200, unit: 'g' },
    })).rejects.toBeInstanceOf(InsufficientQuantityError)

    expect((await repo.findById('inv-1', HH))?.quantity.value).toBe(100)
  })

  it('returns a preview plan without modifying any state', async () => {
    await seedLine(repo, { id: 'inv-pantry', ingredientId: 'ing-pasta', value: 500, location: 'pantry', createdAt: new Date('2026-05-01T08:00:00Z') })
    await seedLine(repo, { id: 'inv-fridge', ingredientId: 'ing-pasta', value: 300, location: 'fridge', createdAt: new Date('2026-05-02T08:00:00Z') })

    const result = await useCase.execute({
      householdId: HH,
      barcode: BARCODE_PASTA,
      quantity: { value: 600, unit: 'g' },
      preview: true,
    })

    expect(result.mode).toBe('preview')
    if (result.mode !== 'preview') return
    expect(result.candidates).toHaveLength(2)
    expect(result.totalAvailable).toEqual({ value: 800, unit: 'g' })
    expect(result.fullyConsumed).toBe(false)

    expect((await repo.findById('inv-pantry', HH))?.quantity.value).toBe(500)
    expect((await repo.findById('inv-fridge', HH))?.quantity.value).toBe(300)
  })

  it('orders non-default locations by createdAt ASC after the default storage', async () => {
    await seedLine(repo, { id: 'inv-pantry', ingredientId: 'ing-pasta', value: 100, location: 'pantry', createdAt: new Date('2026-01-01T08:00:00Z') })
    await seedLine(repo, { id: 'inv-freezer', ingredientId: 'ing-pasta', value: 100, location: 'freezer', createdAt: new Date('2026-02-01T08:00:00Z') })
    await seedLine(repo, { id: 'inv-fridge', ingredientId: 'ing-pasta', value: 100, location: 'fridge', createdAt: new Date('2026-03-01T08:00:00Z') })

    const result = await useCase.execute({
      householdId: HH,
      barcode: BARCODE_PASTA,
      quantity: { value: 250, unit: 'g' },
    })

    if (result.mode !== 'normal') throw new Error('expected normal mode')
    expect(result.impactedLines.map((l) => l.lineId)).toEqual(['inv-pantry', 'inv-freezer', 'inv-fridge'])
    expect(result.impactedLines[2]?.quantityRemoved).toEqual({ value: 50, unit: 'g' })
  })

  it('rejects an unknown barcode', async () => {
    await expect(useCase.execute({
      householdId: HH,
      barcode: BARCODE_UNKNOWN,
      quantity: { value: 100, unit: 'g' },
    })).rejects.toBeInstanceOf(ItemNotFoundError)
  })

  it('rejects an incompatible unit', async () => {
    await seedLine(repo, { id: 'inv-1', ingredientId: 'ing-pasta', value: 500, location: 'pantry', createdAt: new Date() })

    await expect(useCase.execute({
      householdId: HH,
      barcode: BARCODE_PASTA,
      quantity: { value: 1, unit: 'l' },
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })
})
