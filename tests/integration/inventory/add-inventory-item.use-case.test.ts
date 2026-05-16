import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { InvalidIngredientReferenceError } from '../../../server/contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { InvalidStorageLocationError } from '../../../server/contexts/inventory/domain/value-objects/storage-location.vo'
import { InvalidQuantityError } from '../../../shared/units/quantity'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

const HH = 'hh-1'

describe('AddInventoryItemUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let lookup: InMemoryIngredientLookup
  let useCase: AddInventoryItemUseCase

  beforeEach(() => {
    repo = new InMemoryInventoryItemRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-milk', name: 'Lait', category: 'dairy', canonicalUnit: 'ml', storage: 'fridge', archived: false })
    lookup.add(HH, { id: 'ing-archived', name: 'Archivé', category: 'other', canonicalUnit: 'g', storage: 'pantry', archived: true })

    let counter = 0
    const now = new Date('2026-05-15T10:00:00Z')
    useCase = new AddInventoryItemUseCase(repo, lookup, () => `item-${++counter}`, () => now)
  })

  it('creates an item with the location derived from the ingredient', async () => {
    const result = await useCase.execute({
      householdId: HH,
      ingredientId: 'ing-pasta',
      quantity: { value: 500, unit: 'g' },
    })

    expect(result).toEqual({
      id: 'item-1',
      ingredientId: 'ing-pasta',
      name: 'Pâtes',
      category: 'grocery',
      quantity: { value: 500, unit: 'g' },
      location: 'pantry',
      updatedAt: '2026-05-15T10:00:00.000Z',
    })

    const stored = await repo.findById('item-1', HH)
    expect(stored?.ingredientId).toBe('ing-pasta')
    expect(stored?.location.value).toBe('pantry')
  })

  it('accepts an explicit location that overrides the default', async () => {
    const result = await useCase.execute({
      householdId: HH,
      ingredientId: 'ing-pasta',
      quantity: { value: 500, unit: 'g' },
      location: 'fridge',
    })
    expect(result.location).toBe('fridge')
  })

  it('converts user quantity to canonical units (L → ml)', async () => {
    const result = await useCase.execute({
      householdId: HH,
      ingredientId: 'ing-milk',
      quantity: { value: 1, unit: 'l' },
    })
    expect(result.quantity).toEqual({ value: 1000, unit: 'ml' })
    expect(result.location).toBe('fridge')
  })

  it('rejects an unknown ingredient', async () => {
    await expect(useCase.execute({
      householdId: HH,
      ingredientId: 'ing-unknown',
      quantity: { value: 1, unit: 'g' },
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects an ingredient from another household', async () => {
    await expect(useCase.execute({
      householdId: 'hh-2',
      ingredientId: 'ing-pasta',
      quantity: { value: 1, unit: 'g' },
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects an archived ingredient', async () => {
    await expect(useCase.execute({
      householdId: HH,
      ingredientId: 'ing-archived',
      quantity: { value: 1, unit: 'g' },
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects an incompatible unit dimension', async () => {
    await expect(useCase.execute({
      householdId: HH,
      ingredientId: 'ing-pasta',
      quantity: { value: 1, unit: 'ml' },
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects an invalid explicit location', async () => {
    await expect(useCase.execute({
      householdId: HH,
      ingredientId: 'ing-pasta',
      quantity: { value: 1, unit: 'g' },
      location: 'freezer',
    })).rejects.toBeInstanceOf(InvalidStorageLocationError)
  })

  it('rejects a negative quantity', async () => {
    await expect(useCase.execute({
      householdId: HH,
      ingredientId: 'ing-pasta',
      quantity: { value: -1, unit: 'g' },
    })).rejects.toBeInstanceOf(InvalidQuantityError)
  })
})
