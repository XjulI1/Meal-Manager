import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { InvalidIngredientReferenceError } from '../../../server/contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { InvalidStorageLocationError } from '../../../server/contexts/inventory/domain/value-objects/storage-location.vo'
import { InvalidQuantityError } from '../../../shared/units/quantity'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

const HH = 'hh-1'

describe('AddInventoryItemUseCase (upsert)', () => {
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

  describe('creation (no existing line)', () => {
    it('creates an item with the location derived from the ingredient', async () => {
      const result = await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-pasta',
        quantity: { value: 500, unit: 'g' },
      })

      expect(result.created).toBe(true)
      expect(result.item).toEqual({
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
      expect(result.created).toBe(true)
      expect(result.item.location).toBe('fridge')
    })

    it('converts user quantity to canonical units (L → ml)', async () => {
      const result = await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-milk',
        quantity: { value: 1, unit: 'l' },
      })
      expect(result.item.quantity).toEqual({ value: 1000, unit: 'ml' })
      expect(result.item.location).toBe('fridge')
    })

    it('accepts an explicit freezer location', async () => {
      const result = await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-pasta',
        quantity: { value: 500, unit: 'g' },
        location: 'freezer',
      })
      expect(result.item.location).toBe('freezer')
    })
  })

  describe('upsert / increment (existing line for same triple)', () => {
    it('increments quantity on second add with same (ingredient, location)', async () => {
      const first = await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-pasta',
        quantity: { value: 500, unit: 'g' },
      })
      expect(first.created).toBe(true)

      const second = await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-pasta',
        quantity: { value: 500, unit: 'g' },
      })
      expect(second.created).toBe(false)
      expect(second.item.id).toBe(first.item.id)
      expect(second.item.quantity).toEqual({ value: 1000, unit: 'g' })

      // Only one stored line.
      const all = await repo.listForHousehold(HH)
      expect(all).toHaveLength(1)
    })

    it('increments with unit conversion at the boundary (L on a ml ingredient)', async () => {
      await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-milk',
        quantity: { value: 500, unit: 'ml' },
      })
      const second = await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-milk',
        quantity: { value: 1, unit: 'l' },
      })
      expect(second.created).toBe(false)
      expect(second.item.quantity).toEqual({ value: 1500, unit: 'ml' })
    })

    it('creates a distinct line when the location differs', async () => {
      const pantry = await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-pasta',
        quantity: { value: 500, unit: 'g' },
      })
      const fridge = await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-pasta',
        quantity: { value: 100, unit: 'g' },
        location: 'fridge',
      })
      expect(pantry.created).toBe(true)
      expect(fridge.created).toBe(true)
      expect(fridge.item.id).not.toBe(pantry.item.id)
      expect(await repo.listForHousehold(HH)).toHaveLength(2)
    })

    it('handles the concurrent-insert race via retry', async () => {
      // Seed a "racy" line that already exists in the repo.
      await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-pasta',
        quantity: { value: 300, unit: 'g' },
      })

      // Simulate the race: the next find returns null (writer hasn't seen the
      // racy commit yet), the insert then fails on the unique constraint, and
      // the use case must retry by re-reading + incrementing.
      repo.skipNextFindByIngredientAndLocation = true
      repo.forceNextInsertConflict = true

      const result = await useCase.execute({
        householdId: HH,
        ingredientId: 'ing-pasta',
        quantity: { value: 200, unit: 'g' },
      })

      expect(result.created).toBe(false)
      expect(result.item.quantity).toEqual({ value: 500, unit: 'g' })
      // No second line was created.
      expect(await repo.listForHousehold(HH)).toHaveLength(1)
    })
  })

  describe('errors', () => {
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
        location: 'basement',
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
})
