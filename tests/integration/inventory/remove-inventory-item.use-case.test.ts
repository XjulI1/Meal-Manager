import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { RemoveInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/remove-inventory-item.use-case'
import { ItemNotFoundError } from '../../../server/contexts/inventory/domain/errors/item-not-found.error'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

const HH = 'hh-1'

describe('RemoveInventoryItemUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let lookup: InMemoryIngredientLookup
  let add: AddInventoryItemUseCase
  let remove: RemoveInventoryItemUseCase

  beforeEach(async () => {
    repo = new InMemoryInventoryItemRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })

    let counter = 0
    add = new AddInventoryItemUseCase(repo, lookup, () => `item-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    remove = new RemoveInventoryItemUseCase(repo)
    await add.execute({ householdId: HH, ingredientId: 'ing-pasta', quantity: { value: 500, unit: 'g' } })
  })

  it('removes an existing item', async () => {
    await remove.execute({ householdId: HH, id: 'item-1' })
    expect(await repo.findById('item-1', HH)).toBeNull()
  })

  it('rejects removal of an item belonging to another household', async () => {
    await expect(remove.execute({ householdId: 'hh-2', id: 'item-1' })).rejects.toBeInstanceOf(ItemNotFoundError)
    expect(await repo.findById('item-1', HH)).not.toBeNull()
  })

  it('rejects removal of an unknown item', async () => {
    await expect(remove.execute({ householdId: HH, id: 'item-999' })).rejects.toBeInstanceOf(ItemNotFoundError)
  })
})
