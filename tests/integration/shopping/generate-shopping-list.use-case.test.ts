import { beforeEach, describe, expect, it } from 'vitest'
import { GenerateShoppingListUseCase } from '../../../server/contexts/shopping/application/use-cases/generate-shopping-list.use-case'
import { MenuNotAvailableError } from '../../../server/contexts/shopping/domain/errors/menu-not-available.error'
import { FakeIngredientSummaryFinder, FakeInventoryFinder, FakeMenuFinder, FakeRecipeFinder, ingredientSlot, recipeSlot } from './in-memory/fake-finders'
import { InMemoryShoppingListRepository } from './in-memory/in-memory-shopping-list.repository'

describe('GenerateShoppingListUseCase', () => {
  let snapshots: InMemoryShoppingListRepository
  let menus: FakeMenuFinder
  let recipes: FakeRecipeFinder
  let inventory: FakeInventoryFinder
  let summaries: FakeIngredientSummaryFinder
  let useCase: GenerateShoppingListUseCase

  beforeEach(() => {
    snapshots = new InMemoryShoppingListRepository()
    menus = new FakeMenuFinder()
    recipes = new FakeRecipeFinder()
    inventory = new FakeInventoryFinder()
    summaries = new FakeIngredientSummaryFinder()
    summaries
      .add('ing-pasta', 'Pâtes', 'grocery')
      .add('ing-butter', 'Beurre', 'dairy')
      .add('ing-salt', 'Sel', 'grocery')
      .add('ing-bread', 'Pain', 'bakery')
    let counter = 0
    useCase = new GenerateShoppingListUseCase(
      snapshots,
      menus,
      recipes,
      inventory,
      summaries,
      () => `id-${++counter}`,
      () => new Date('2026-05-15T10:00:00Z'),
    )
  })

  it('generates a snapshot subtracting inventory and dropping zero/negative entries', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [recipeSlot('recipe-pasta', 4)],
    })
    recipes.register('recipe-pasta', 'hh-1', 2, [
      { ingredientId: 'ing-pasta', value: 200, unit: 'g' },
      { ingredientId: 'ing-butter', value: 30, unit: 'g' },
    ])
    inventory.setStock('hh-1', [{ ingredientId: 'ing-butter', value: 100, unit: 'g' }])

    const view = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(view.menuId).toBe('menu-1')
    expect(view.items).toHaveLength(1)
    expect(view.items[0]).toMatchObject({
      ingredientId: 'ing-pasta',
      ingredientName: 'Pâtes',
      category: 'grocery',
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
      slots: [recipeSlot('recipe-1', 2)],
    })
    recipes.register('recipe-1', 'hh-1', 2, [{ ingredientId: 'ing-salt', value: 10, unit: 'g' }])

    const first = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    await snapshots.setItemChecked(first.id, first.items[0]!.id, true)
    const reused = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1', reuse: true })
    expect(reused.id).toBe(first.id)
    expect(reused.items[0]?.isChecked).toBe(true)
  })

  it('reuse=false (default) replaces the snapshot and resets checked state', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [recipeSlot('recipe-1', 2)],
    })
    recipes.register('recipe-1', 'hh-1', 2, [{ ingredientId: 'ing-salt', value: 10, unit: 'g' }])

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
      slots: [recipeSlot('r1', 1), recipeSlot('r2', 1)],
    })
    recipes.register('r1', 'hh-1', 1, [{ ingredientId: 'ing-butter', value: 30, unit: 'g' }])
    recipes.register('r2', 'hh-1', 1, [{ ingredientId: 'ing-butter', value: 50, unit: 'g' }])

    const view = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(view.items).toHaveLength(1)
    expect(view.items[0]).toMatchObject({
      ingredientId: 'ing-butter',
      ingredientName: 'Beurre',
      quantity: { value: 80, unit: 'g' },
    })
  })

  it('orders items by aisle category then name', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [recipeSlot('r-mixed', 1)],
    })
    summaries
      .add('ing-tomato', 'Tomate', 'produce')
      .add('ing-cheese', 'Fromage', 'dairy')
    recipes.register('r-mixed', 'hh-1', 1, [
      { ingredientId: 'ing-cheese', value: 100, unit: 'g' },
      { ingredientId: 'ing-tomato', value: 200, unit: 'g' },
      { ingredientId: 'ing-pasta', value: 300, unit: 'g' },
    ])

    const view = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(view.items.map((i) => i.ingredientName)).toEqual(['Tomate', 'Fromage', 'Pâtes'])
  })

  it('a free ingredient alone contributes to the list', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [ingredientSlot('ing-bread', 300, 'g')],
    })

    const view = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(view.items).toHaveLength(1)
    expect(view.items[0]).toMatchObject({ ingredientId: 'ing-bread', ingredientName: 'Pain', quantity: { value: 300, unit: 'g' } })
  })

  it('a recipe ingredient and a free ingredient of the same kind are summed', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [recipeSlot('recipe-1', 1), ingredientSlot('ing-butter', 50, 'g')],
    })
    recipes.register('recipe-1', 'hh-1', 1, [{ ingredientId: 'ing-butter', value: 30, unit: 'g' }])

    const view = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(view.items).toHaveLength(1)
    expect(view.items[0]).toMatchObject({ ingredientId: 'ing-butter', quantity: { value: 80, unit: 'g' } })
  })

  it('free ingredients are subtracted from inventory like recipe ingredients', async () => {
    menus.register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [ingredientSlot('ing-bread', 300, 'g')],
    })
    inventory.setStock('hh-1', [{ ingredientId: 'ing-bread', value: 300, unit: 'g' }])

    const view = await useCase.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(view.items).toEqual([])
  })
})
