import { beforeEach, describe, expect, it } from 'vitest'
import { GenerateShoppingListUseCase } from '../../../server/contexts/shopping/application/use-cases/generate-shopping-list.use-case'
import { GetShoppingListByMenuUseCase } from '../../../server/contexts/shopping/application/use-cases/get-shopping-list-by-menu.use-case'
import { ShoppingListNotFoundError } from '../../../server/contexts/shopping/domain/errors/shopping-list-not-found.error'
import { FakeInventoryFinder, FakeMenuFinder, FakeRecipeFinder } from './in-memory/fake-finders'
import { InMemoryShoppingListRepository } from './in-memory/in-memory-shopping-list.repository'

describe('GetShoppingListByMenuUseCase', () => {
  let snapshots: InMemoryShoppingListRepository
  let get: GetShoppingListByMenuUseCase
  let generate: GenerateShoppingListUseCase

  beforeEach(() => {
    snapshots = new InMemoryShoppingListRepository()
    const menus = new FakeMenuFinder().register({
      id: 'menu-1',
      householdId: 'hh-1',
      slots: [{ recipeId: 'r1', servings: 1 }],
    })
    const recipes = new FakeRecipeFinder().register('r1', 'hh-1', 1, [{ name: 'X', value: 10, unit: 'g' }])
    const inventory = new FakeInventoryFinder()
    let counter = 0
    generate = new GenerateShoppingListUseCase(
      snapshots, menus, recipes, inventory,
      () => `id-${++counter}`,
      () => new Date('2026-05-15T10:00:00Z'),
    )
    get = new GetShoppingListByMenuUseCase(snapshots)
  })

  it('returns the existing snapshot for a menu', async () => {
    const generated = await generate.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    const fetched = await get.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    expect(fetched.id).toBe(generated.id)
  })

  it('rejects when no snapshot exists for the menu', async () => {
    await expect(get.execute({ householdId: 'hh-1', menuId: 'menu-2' }))
      .rejects.toBeInstanceOf(ShoppingListNotFoundError)
  })

  it('rejects when the snapshot belongs to another household', async () => {
    await generate.execute({ householdId: 'hh-1', menuId: 'menu-1' })
    await expect(get.execute({ householdId: 'hh-2', menuId: 'menu-1' }))
      .rejects.toBeInstanceOf(ShoppingListNotFoundError)
  })
})
