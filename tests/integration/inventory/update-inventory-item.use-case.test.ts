import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { UpdateInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/update-inventory-item.use-case'
import { InvalidIngredientReferenceError } from '../../../server/contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { ItemNotFoundError } from '../../../server/contexts/inventory/domain/errors/item-not-found.error'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

const HH = 'hh-1'

describe('UpdateInventoryItemUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let lookup: InMemoryIngredientLookup
  let add: AddInventoryItemUseCase
  let update: UpdateInventoryItemUseCase
  let nowCounter = 0

  beforeEach(async () => {
    repo = new InMemoryInventoryItemRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })

    let counter = 0
    nowCounter = 0
    const clock = () => new Date(`2026-05-15T10:${String(nowCounter++).padStart(2, '0')}:00Z`)
    add = new AddInventoryItemUseCase(repo, lookup, () => `item-${++counter}`, clock)
    update = new UpdateInventoryItemUseCase(repo, lookup, clock)
    await add.execute({ householdId: HH, ingredientId: 'ing-pasta', quantity: { value: 500, unit: 'g' } })
  })

  it('updates the quantity', async () => {
    const result = await update.execute({
      householdId: HH,
      id: 'item-1',
      quantity: { value: 250, unit: 'g' },
    })
    expect(result.quantity).toEqual({ value: 250, unit: 'g' })
    expect(result.name).toBe('Pâtes')
  })

  it('updates the location independently', async () => {
    const result = await update.execute({ householdId: HH, id: 'item-1', location: 'fridge' })
    expect(result.location).toBe('fridge')
    expect(result.quantity).toEqual({ value: 500, unit: 'g' })
  })

  it('rejects an update with incompatible unit dimension', async () => {
    await expect(update.execute({ householdId: HH, id: 'item-1', quantity: { value: 1, unit: 'ml' } }))
      .rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects updates from another household', async () => {
    await expect(update.execute({ householdId: 'hh-2', id: 'item-1', location: 'fridge' }))
      .rejects.toBeInstanceOf(ItemNotFoundError)
  })

  it('rejects when item does not exist', async () => {
    await expect(update.execute({ householdId: HH, id: 'item-999', location: 'fridge' }))
      .rejects.toBeInstanceOf(ItemNotFoundError)
  })
})
