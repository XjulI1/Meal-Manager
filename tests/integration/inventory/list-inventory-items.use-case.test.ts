import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { ListInventoryItemsUseCase } from '../../../server/contexts/inventory/application/use-cases/list-inventory-items.use-case'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'

const HH = 'hh-1'

describe('ListInventoryItemsUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let lookup: InMemoryIngredientLookup
  let add: AddInventoryItemUseCase
  let list: ListInventoryItemsUseCase

  beforeEach(async () => {
    repo = new InMemoryInventoryItemRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-rice', name: 'Riz', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-lentils', name: 'Lentilles', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-milk', name: 'Lait', category: 'dairy', canonicalUnit: 'ml', storage: 'fridge', archived: false })
    lookup.add(HH, { id: 'ing-butter', name: 'Beurre', category: 'dairy', canonicalUnit: 'g', storage: 'fridge', archived: false })
    lookup.add(HH, { id: 'ing-peas', name: 'Petits pois surgelés', category: 'frozen', canonicalUnit: 'g', storage: 'freezer', archived: false })
    lookup.add('hh-2', { id: 'ing-other', name: 'Other', category: 'other', canonicalUnit: 'g', storage: 'pantry', archived: false })

    let counter = 0
    add = new AddInventoryItemUseCase(repo, lookup, () => `item-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    list = new ListInventoryItemsUseCase(repo, lookup)

    await add.execute({ householdId: HH, ingredientId: 'ing-pasta', quantity: { value: 500, unit: 'g' } })
    await add.execute({ householdId: HH, ingredientId: 'ing-rice', quantity: { value: 1, unit: 'kg' } })
    await add.execute({ householdId: HH, ingredientId: 'ing-lentils', quantity: { value: 250, unit: 'g' } })
    await add.execute({ householdId: HH, ingredientId: 'ing-milk', quantity: { value: 1, unit: 'l' } })
    await add.execute({ householdId: HH, ingredientId: 'ing-butter', quantity: { value: 250, unit: 'g' } })
    await add.execute({ householdId: HH, ingredientId: 'ing-peas', quantity: { value: 1, unit: 'kg' } })
    await add.execute({ householdId: 'hh-2', ingredientId: 'ing-other', quantity: { value: 100, unit: 'g' } })
  })

  it('lists every item of the household with resolved name and category', async () => {
    const items = await list.execute({ householdId: HH })
    expect(items).toHaveLength(6)
    expect(items.find((i) => i.name === 'Pâtes')?.category).toBe('grocery')
    expect(items.find((i) => i.name === 'Lait')?.category).toBe('dairy')
  })

  it('filters by location', async () => {
    const items = await list.execute({ householdId: HH, location: 'pantry' })
    expect(items.map((i) => i.name).sort()).toEqual(['Lentilles', 'Pâtes', 'Riz'])
  })

  it('filters by freezer location', async () => {
    const items = await list.execute({ householdId: HH, location: 'freezer' })
    expect(items.map((i) => i.name)).toEqual(['Petits pois surgelés'])
    expect(items[0]?.quantity).toEqual({ value: 1000, unit: 'g' })
  })

  it('returns canonical units', async () => {
    const items = await list.execute({ householdId: HH, location: 'fridge' })
    const lait = items.find((i) => i.name === 'Lait')
    expect(lait?.quantity).toEqual({ value: 1000, unit: 'ml' })
  })

  it('does not leak items from another household', async () => {
    const items = await list.execute({ householdId: HH })
    expect(items.find((i) => i.name === 'Other')).toBeUndefined()
  })
})
