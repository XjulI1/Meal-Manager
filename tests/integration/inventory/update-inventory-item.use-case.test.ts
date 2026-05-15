import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { UpdateInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/update-inventory-item.use-case'
import { ItemNotFoundError } from '../../../server/contexts/inventory/domain/errors/item-not-found.error'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

describe('UpdateInventoryItemUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let add: AddInventoryItemUseCase
  let update: UpdateInventoryItemUseCase
  let nowCounter = 0

  beforeEach(async () => {
    repo = new InMemoryInventoryItemRepository()
    let counter = 0
    nowCounter = 0
    const clock = () => new Date(`2026-05-15T10:${String(nowCounter++).padStart(2, '0')}:00Z`)
    add = new AddInventoryItemUseCase(repo, () => `item-${++counter}`, clock)
    update = new UpdateInventoryItemUseCase(repo, clock)
    await add.execute({
      householdId: 'hh-1',
      name: 'Pâtes',
      quantity: { value: 500, unit: 'g' },
      location: 'pantry',
    })
  })

  it('updates the quantity', async () => {
    const result = await update.execute({
      householdId: 'hh-1',
      id: 'item-1',
      quantity: { value: 250, unit: 'g' },
    })
    expect(result.quantity).toEqual({ value: 250, unit: 'g' })
  })

  it('updates the name only', async () => {
    const result = await update.execute({
      householdId: 'hh-1',
      id: 'item-1',
      name: 'Spaghetti',
    })
    expect(result.name).toBe('Spaghetti')
    expect(result.quantity).toEqual({ value: 500, unit: 'g' })
  })

  it('rejects updates from another household', async () => {
    await expect(update.execute({
      householdId: 'hh-2',
      id: 'item-1',
      name: 'Hijacked',
    })).rejects.toBeInstanceOf(ItemNotFoundError)

    const item = await repo.findById('item-1', 'hh-1')
    expect(item?.name).toBe('Pâtes')
  })

  it('rejects when item does not exist', async () => {
    await expect(update.execute({
      householdId: 'hh-1',
      id: 'item-999',
      name: 'Ghost',
    })).rejects.toBeInstanceOf(ItemNotFoundError)
  })
})
