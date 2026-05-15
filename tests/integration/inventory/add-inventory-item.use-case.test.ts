import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { InvalidStorageLocationError } from '../../../server/contexts/inventory/domain/value-objects/storage-location.vo'
import { InvalidQuantityError } from '../../../shared/units/quantity'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

describe('AddInventoryItemUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let useCase: AddInventoryItemUseCase

  beforeEach(() => {
    repo = new InMemoryInventoryItemRepository()
    let counter = 0
    const now = new Date('2026-05-15T10:00:00Z')
    useCase = new AddInventoryItemUseCase(repo, () => `item-${++counter}`, () => now)
  })

  it('creates a pantry item with canonical units', async () => {
    const result = await useCase.execute({
      householdId: 'hh-1',
      name: 'Pâtes',
      quantity: { value: 500, unit: 'g' },
      location: 'pantry',
    })

    expect(result).toEqual({
      id: 'item-1',
      name: 'Pâtes',
      quantity: { value: 500, unit: 'g' },
      location: 'pantry',
      updatedAt: '2026-05-15T10:00:00.000Z',
    })

    const stored = await repo.findById('item-1', 'hh-1')
    expect(stored?.name).toBe('Pâtes')
    expect(stored?.location.value).toBe('pantry')
  })

  it('converts user quantity to canonical units (L → ml)', async () => {
    const result = await useCase.execute({
      householdId: 'hh-1',
      name: 'Lait',
      quantity: { value: 1, unit: 'l' },
      location: 'fridge',
    })

    expect(result.quantity).toEqual({ value: 1000, unit: 'ml' })
    expect(result.location).toBe('fridge')
  })

  it('rejects an invalid location', async () => {
    await expect(useCase.execute({
      householdId: 'hh-1',
      name: 'Test',
      quantity: { value: 1, unit: 'unit' },
      location: 'freezer',
    })).rejects.toBeInstanceOf(InvalidStorageLocationError)
  })

  it('rejects a negative quantity', async () => {
    await expect(useCase.execute({
      householdId: 'hh-1',
      name: 'Test',
      quantity: { value: -1, unit: 'g' },
      location: 'pantry',
    })).rejects.toBeInstanceOf(InvalidQuantityError)
  })

  it('trims the name', async () => {
    const result = await useCase.execute({
      householdId: 'hh-1',
      name: '  Pâtes  ',
      quantity: { value: 500, unit: 'g' },
      location: 'pantry',
    })
    expect(result.name).toBe('Pâtes')
  })
})
