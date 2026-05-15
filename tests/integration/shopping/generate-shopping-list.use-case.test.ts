import { beforeEach, describe, expect, it } from 'vitest'
import { GenerateShoppingListUseCase } from '../../../server/contexts/shopping/application/use-cases/generate-shopping-list.use-case'
import { MenuNotAvailableError } from '../../../server/contexts/shopping/domain/errors/menu-not-available.error'
import { FakeInventoryFinder, FakeMenuFinder, FakeRecipeFinder } from './in-memory/fake-finders'
import { InMemoryShoppingListRepository } from './in-memory/in-memory-shopping-list.repository'

describe('GenerateShoppingListUseCase', () => {
  let snapshots: InMemoryShoppingListRepository
  let menus: FakeMenuFinder
  let recipes: FakeRecipeFinder
  let inventory: FakeInventoryFinder
  let useCase: GenerateShoppingListUseCase

  beforeEach(() => {
    snapshots = new InMemoryShoppingListRepository()
    menus = new FakeMenuFinder()
    recipes = new FakeRecipeFinder()
    inventory = new FakeInventoryFinder()
    let counter = 0
    useCase = new GenerateShoppingListUseCase(
      snapshots,
      menus,
      recipes,
      inventory,
      () => `id-${++counter}`,
      () => new Date('2026-05-15T10:00:00Z'),
    )
  })

  it('generates a snapshot subtracting inventory and dropping zero/negative entries', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [{ recipeId: 'recipe-pasta', servings: 4 }],
    })
    recipes.register('recipe-pasta', 'hh-1', 2, [
      { name: 'Pâtes', value: 200, unit: 'g' },
      { name: 'Beurre', value: 30, unit: 'g' },
    ])
    inventory.setStock('hh-1', [{ name: 'Beurre', value: 100, unit: 'g' }])

    const view = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(view.menuId).toBe('menu-1')
    expect(view.items).toHaveLength(1)
    expect(view.items[0]).toMatchObject({
      ingredientName: 'Pâtes',
      quantity: { value: 400, unit: 'g' },
      isChecked: false,
    })
  })

  it('returns an empty list for an empty menu', async () => {
    menus.register({ id: 'menu-1', householdId: 'hh-1', slots: [] })

    const view = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(view.items).toEqual([])
  })

  it('rejects a menu from another household', async () => {
    menus.register({ id: 'menu-A', householdId: 'hh-1', slots: [] })
    await expect(useCase.execute({ householdId: 'hh-2', menuId: 'menu-A' }))
      .rejects.toBeInstanceOf(MenuNotAvailableError)
  })

  it('reuse=true returns the existing snapshot unchanged', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [{ recipeId: 'recipe-1', servings: 2 }],
    })
    recipes.register('recipe-1', 'hh-1', 2, [{ name: 'Sel', value: 10, unit: 'g' }])

    const first = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    // mark the only item checked
    await snapshots.setItemChecked(first.id, first.items[0]!.id, true)
    const reused = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1', reuse: true })
    expect(reused.id).toBe(first.id)
    expect(reused.items[0]?.isChecked).toBe(true)
  })

  it('reuse=false (default) replaces the snapshot and resets checked state', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [{ recipeId: 'recipe-1', servings: 2 }],
    })
    recipes.register('recipe-1', 'hh-1', 2, [{ name: 'Sel', value: 10, unit: 'g' }])

    const first = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    await snapshots.setItemChecked(first.id, first.items[0]!.id, true)
    const regenerated = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(regenerated.id).not.toBe(first.id)
    expect(regenerated.items[0]?.isChecked).toBe(false)
  })

  it('aggregates the same ingredient across two slots', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [
        { recipeId: 'r1', servings: 1 },
        { recipeId: 'r2', servings: 1 },
      ],
    })
    recipes.register('r1', 'hh-1', 1, [{ name: 'Beurre', value: 30, unit: 'g' }])
    recipes.register('r2', 'hh-1', 1, [{ name: 'Beurre', value: 50, unit: 'g' }])

    const view = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(view.items).toHaveLength(1)
    expect(view.items[0]).toMatchObject({
      ingredientName: 'Beurre',
      quantity: { value: 80, unit: 'g' },
    })
  })
})
