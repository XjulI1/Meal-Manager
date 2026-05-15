import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { RemoveInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/remove-inventory-item.use-case'
import { ItemNotFoundError } from '../../../server/contexts/inventory/domain/errors/item-not-found.error'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

describe('RemoveInventoryItemUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let add: AddInventoryItemUseCase
  let remove: RemoveInventoryItemUseCase

  beforeEach(async () => {
    repo = new InMemoryInventoryItemRepository()
    let counter = 0
    add = new AddInventoryItemUseCase(repo, () => `item-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    remove = new RemoveInventoryItemUseCase(repo)
    await add.execute({ householdId: 'hh-1', name: 'Pâtes', quantity: { value: 500, unit: 'g' }, location: 'pantry' })
  })

  it('removes an existing item', async () => {
    await remove.execute({ householdId: 'hh-1', id: 'item-1' })
    expect(await repo.findById('item-1', 'hh-1')).toBeNull()
  })

  it('rejects removal of an item belonging to another household', async () => {
    await expect(remove.execute({ householdId: 'hh-2', id: 'item-1' })).rejects.toBeInstanceOf(ItemNotFoundError)
    expect(await repo.findById('item-1', 'hh-1')).not.toBeNull()
  })

  it('rejects removal of an unknown item', async () => {
    await expect(remove.execute({ householdId: 'hh-1', id: 'item-999' })).rejects.toBeInstanceOf(ItemNotFoundError)
  })
})
