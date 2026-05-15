import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { AdjustQuantityUseCase } from '../../../server/contexts/inventory/application/use-cases/adjust-quantity.use-case'
import { ItemNotFoundError } from '../../../server/contexts/inventory/domain/errors/item-not-found.error'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

describe('AdjustQuantityUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let add: AddInventoryItemUseCase
  let adjust: AdjustQuantityUseCase

  beforeEach(async () => {
    repo = new InMemoryInventoryItemRepository()
    let counter = 0
    add = new AddInventoryItemUseCase(repo, () => `item-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    adjust = new AdjustQuantityUseCase(repo, () => new Date('2026-05-15T11:00:00Z'))
    await add.execute({ householdId: 'hh-1', name: 'Pâtes', quantity: { value: 200, unit: 'g' }, location: 'pantry' })
  })

  it('increments the quantity', async () => {
    const result = await adjust.execute({
      householdId: 'hh-1',
      id: 'item-1',
      delta: { value: 50, unit: 'g' },
    })
    expect(result.removed).toBe(false)
    if (!result.removed) expect(result.item.quantity).toEqual({ value: 250, unit: 'g' })
  })

  it('decrements the quantity (positive delta value, negative meaning)', async () => {
    const result = await adjust.execute({
      householdId: 'hh-1',
      id: 'item-1',
      delta: { value: -50, unit: 'g' },
    })
    expect(result.removed).toBe(false)
    if (!result.removed) expect(result.item.quantity).toEqual({ value: 150, unit: 'g' })
  })

  it('removes the item when the resulting quantity is zero', async () => {
    const result = await adjust.execute({
      householdId: 'hh-1',
      id: 'item-1',
      delta: { value: -200, unit: 'g' },
    })
    expect(result).toEqual({ removed: true, id: 'item-1' })
    expect(await repo.findById('item-1', 'hh-1')).toBeNull()
  })

  it('clamps to zero and removes when delta exceeds the current quantity', async () => {
    const result = await adjust.execute({
      householdId: 'hh-1',
      id: 'item-1',
      delta: { value: -300, unit: 'g' },
    })
    expect(result).toEqual({ removed: true, id: 'item-1' })
    expect(await repo.findById('item-1', 'hh-1')).toBeNull()
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
      householdId: 'hh-1',
      id: 'item-1',
      delta: { value: 1, unit: 'kg' },
    })
    expect(result.removed).toBe(false)
    if (!result.removed) expect(result.item.quantity).toEqual({ value: 1200, unit: 'g' })
  })
})
