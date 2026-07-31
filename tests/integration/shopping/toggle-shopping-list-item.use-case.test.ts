import { beforeEach, describe, expect, it } from 'vitest'
import { GenerateShoppingListUseCase } from '../../../server/contexts/shopping/application/use-cases/generate-shopping-list.use-case'
import { ToggleShoppingListItemUseCase } from '../../../server/contexts/shopping/application/use-cases/toggle-shopping-list-item.use-case'
import {
  ShoppingListItemNotFoundError,
  ShoppingListNotFoundError,
} from '../../../server/contexts/shopping/domain/errors/shopping-list-not-found.error'
import { FakeIngredientSummaryFinder, FakeInventoryFinder, FakeMenuFinder, FakeRecipeFinder, recipeSlot } from './in-memory/fake-finders'
import { InMemoryShoppingListRepository } from './in-memory/in-memory-shopping-list.repository'

describe('ToggleShoppingListItemUseCase', () => {
  let snapshots: InMemoryShoppingListRepository
  let toggle: ToggleShoppingListItemUseCase
  let snapshotId: string
  let itemId: string

  beforeEach(async () => {
    snapshots = new InMemoryShoppingListRepository()
    const menus = new FakeMenuFinder().register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [recipeSlot('r1', 2)],
    })
    const recipes = new FakeRecipeFinder().register('r1', 'hh-1', 2, [
      { ingredientId: 'ing-pasta', value: 200, unit: 'g' },
    ])
    const inventory = new FakeInventoryFinder()
    const summaries = new FakeIngredientSummaryFinder().add('ing-pasta', 'Pâtes', 'grocery')

    let counter = 0
    const generate = new GenerateShoppingListUseCase(
      snapshots, menus, recipes, inventory, summaries,
      () => `id-${++counter}`,
      () => new Date('2026-05-15T10:00:00Z'),
    )
    const view = await generate.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    snapshotId = view.id
    itemId = view.items[0]!.id

    toggle = new ToggleShoppingListItemUseCase(snapshots)
  })

  it('checks an item and persists the state', async () => {
    const view = await toggle.execute({ householdId: 'hh-1', snapshotId, itemId, isChecked: true })
    expect(view.items[0]?.isChecked).toBe(true)
  })

  it('unchecks an item', async () => {
    await toggle.execute({ householdId: 'hh-1', snapshotId, itemId, isChecked: true })
    const view = await toggle.execute({ householdId: 'hh-1', snapshotId, itemId, isChecked: false })
    expect(view.items[0]?.isChecked).toBe(false)
  })

  it('rejects a snapshot from another household', async () => {
    await expect(toggle.execute({
      householdId: 'hh-2', snapshotId, itemId, isChecked: true,
    })).rejects.toBeInstanceOf(ShoppingListNotFoundError)
  })

  it('rejects an unknown item', async () => {
    await expect(toggle.execute({
      householdId: 'hh-1', snapshotId, itemId: 'unknown', isChecked: true,
    })).rejects.toBeInstanceOf(ShoppingListItemNotFoundError)
  })
})
