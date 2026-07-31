import { beforeEach, describe, expect, it } from 'vitest'
import { AddSlotItemUseCase } from '../../../server/contexts/meal-planning/application/use-cases/add-slot-item.use-case'
import { GetMenuByWeekUseCase } from '../../../server/contexts/meal-planning/application/use-cases/get-menu-by-week.use-case'
import { MenuNotFoundError } from '../../../server/contexts/meal-planning/domain/errors/menu-not-found.error'
import { RemoveSlotItemUseCase } from '../../../server/contexts/meal-planning/application/use-cases/remove-slot-item.use-case'
import { SlotItemNotFoundError } from '../../../server/contexts/meal-planning/domain/errors/slot-item-not-found.error'
import { FakeIngredientLookup } from './in-memory/fake-ingredient-lookup'
import { FakeRecipeFinder } from './in-memory/fake-recipe-finder'
import { InMemoryMenuRepository } from './in-memory/in-memory-menu.repository'

describe('RemoveSlotItemUseCase', () => {
  let repo: InMemoryMenuRepository
  let get: GetMenuByWeekUseCase
  let add: AddSlotItemUseCase
  let remove: RemoveSlotItemUseCase

  beforeEach(async () => {
    repo = new InMemoryMenuRepository()
    const recipes = new FakeRecipeFinder().register('recipe-A', 'hh-1')
    const ingredients = new FakeIngredientLookup().register({
      id: 'ing-bread', name: 'Pain', category: 'bakery', canonicalUnit: 'g', storage: 'pantry', archived: false, householdId: 'hh-1',
    })
    let counter = 0
    get = new GetMenuByWeekUseCase(repo, () => `menu-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    let itemCounter = 0
    add = new AddSlotItemUseCase(repo, recipes, ingredients, () => `item-${++itemCounter}`, () => new Date('2026-05-15T11:00:00Z'))
    remove = new RemoveSlotItemUseCase(repo, () => new Date('2026-05-15T12:00:00Z'))

    await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-A', servings: 2,
    })
    await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 300, unit: 'g' },
    })
  })

  it('removes a free ingredient, keeping the recipe', async () => {
    await remove.execute({ householdId: 'hh-1', menuId: 'menu-1', itemId: 'item-2' })
    const menu = await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    expect(menu.slots).toHaveLength(1)
    expect(menu.slots[0]?.items).toEqual([{ id: 'item-1', kind: 'recipe', recipeId: 'recipe-A', servings: 2 }])
  })

  it('removing the last item deletes the slot', async () => {
    await remove.execute({ householdId: 'hh-1', menuId: 'menu-1', itemId: 'item-2' })
    await remove.execute({ householdId: 'hh-1', menuId: 'menu-1', itemId: 'item-1' })
    const menu = await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    expect(menu.slots).toHaveLength(0)
  })

  it('rejects removing an unknown item id', async () => {
    await expect(remove.execute({ householdId: 'hh-1', menuId: 'menu-1', itemId: 'unknown' }))
      .rejects.toBeInstanceOf(SlotItemNotFoundError)
  })

  it('rejects removing from a menu of another household', async () => {
    await expect(remove.execute({ householdId: 'hh-2', menuId: 'menu-1', itemId: 'item-1' }))
      .rejects.toBeInstanceOf(MenuNotFoundError)
  })
})
