import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { AdjustQuantityUseCase } from '../../../server/contexts/inventory/application/use-cases/adjust-quantity.use-case'
import { ItemNotFoundError } from '../../../server/contexts/inventory/domain/errors/item-not-found.error'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

const HH = 'hh-1'

describe('AdjustQuantityUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let lookup: InMemoryIngredientLookup
  let add: AddInventoryItemUseCase
  let adjust: AdjustQuantityUseCase

  beforeEach(async () => {
    repo = new InMemoryInventoryItemRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })

    let counter = 0
    add = new AddInventoryItemUseCase(repo, lookup, () => `item-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    adjust = new AdjustQuantityUseCase(repo, lookup, () => new Date('2026-05-15T11:00:00Z'))
    await add.execute({ householdId: HH, ingredientId: 'ing-pasta', quantity: { value: 200, unit: 'g' } })
  })

  it('increments the quantity', async () => {
    const result = await adjust.execute({
      householdId: HH,
      id: 'item-1',
      delta: { value: 50, unit: 'g' },
    })
    expect(result.removed).toBe(false)
    if (!result.removed) expect(result.item.quantity).toEqual({ value: 250, unit: 'g' })
  })

  it('decrements the quantity (negative delta)', async () => {
    const result = await adjust.execute({
      householdId: HH,
      id: 'item-1',
      delta: { value: -50, unit: 'g' },
    })
    expect(result.removed).toBe(false)
    if (!result.removed) expect(result.item.quantity).toEqual({ value: 150, unit: 'g' })
  })

  it('removes the item when the resulting quantity is zero', async () => {
    const result = await adjust.execute({
      householdId: HH,
      id: 'item-1',
      delta: { value: -200, unit: 'g' },
    })
    expect(result).toEqual({ removed: true, id: 'item-1' })
    expect(await repo.findById('item-1', HH)).toBeNull()
  })

  it('clamps to zero and removes when delta exceeds the current quantity', async () => {
    const result = await adjust.execute({
      householdId: HH,
      id: 'item-1',
      delta: { value: -300, unit: 'g' },
    })
    expect(result).toEqual({ removed: true, id: 'item-1' })
    expect(await repo.findById('item-1', HH)).toBeNull()
  })

  it('rejects an adjustment on an item from another household', async () => {
    await expect(adjust.execute({
      householdId: 'hh-2',
      id: 'item-1',
      delta: { value: 100, unit: 'g' },
    })).rejects.toBeInstanceOf(ItemNotFoundError)
  })

  it('handles cross-unit deltas (kg → g)', async () => {
    const result = await adjust.execute({
      householdId: HH,
      id: 'item-1',
      delta: { value: 1, unit: 'kg' },
    })
    expect(result.removed).toBe(false)
    if (!result.removed) expect(result.item.quantity).toEqual({ value: 1200, unit: 'g' })
  })
})
