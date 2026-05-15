import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { ListInventoryItemsUseCase } from '../../../server/contexts/inventory/application/use-cases/list-inventory-items.use-case'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

describe('ListInventoryItemsUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let add: AddInventoryItemUseCase
  let list: ListInventoryItemsUseCase

  beforeEach(async () => {
    repo = new InMemoryInventoryItemRepository()
    let counter = 0
    add = new AddInventoryItemUseCase(repo, () => `item-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    list = new ListInventoryItemsUseCase(repo)

    await add.execute({ householdId: 'hh-1', name: 'Pâtes', quantity: { value: 500, unit: 'g' }, location: 'pantry' })
    await add.execute({ householdId: 'hh-1', name: 'Riz', quantity: { value: 1, unit: 'kg' }, location: 'pantry' })
    await add.execute({ householdId: 'hh-1', name: 'Lentilles', quantity: { value: 250, unit: 'g' }, location: 'pantry' })
    await add.execute({ householdId: 'hh-1', name: 'Lait', quantity: { value: 1, unit: 'l' }, location: 'fridge' })
    await add.execute({ householdId: 'hh-1', name: 'Beurre', quantity: { value: 250, unit: 'g' }, location: 'fridge' })
    await add.execute({ householdId: 'hh-2', name: 'Other', quantity: { value: 100, unit: 'g' }, location: 'pantry' })
  })

  it('lists every item of the household', async () => {
    const items = await list.execute({ householdId: 'hh-1' })
    expect(items).toHaveLength(5)
    expect(items.map((i) => i.name)).toEqual(['Beurre', 'Lait', 'Lentilles', 'Pâtes', 'Riz'])
  })

  it('filters by location', async () => {
    const items = await list.execute({ householdId: 'hh-1', location: 'pantry' })
    expect(items.map((i) => i.name)).toEqual(['Lentilles', 'Pâtes', 'Riz'])
  })

  it('returns canonical units', async () => {
    const items = await list.execute({ householdId: 'hh-1', location: 'fridge' })
    const lait = items.find((i) => i.name === 'Lait')
    expect(lait?.quantity).toEqual({ value: 1000, unit: 'ml' })
  })

  it('does not leak items from another household', async () => {
    const items = await list.execute({ householdId: 'hh-1' })
    expect(items.find((i) => i.name === 'Other')).toBeUndefined()
  })
})
