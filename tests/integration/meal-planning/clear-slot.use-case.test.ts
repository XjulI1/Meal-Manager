import { beforeEach, describe, expect, it } from 'vitest'
import { AssignRecipeToSlotUseCase } from '../../../server/contexts/meal-planning/application/use-cases/assign-recipe-to-slot.use-case'
import { ClearSlotUseCase } from '../../../server/contexts/meal-planning/application/use-cases/clear-slot.use-case'
import { GetMenuByWeekUseCase } from '../../../server/contexts/meal-planning/application/use-cases/get-menu-by-week.use-case'
import { MenuNotFoundError } from '../../../server/contexts/meal-planning/domain/errors/menu-not-found.error'
import { FakeRecipeFinder } from './in-memory/fake-recipe-finder'
import { InMemoryMenuRepository } from './in-memory/in-memory-menu.repository'

describe('ClearSlotUseCase', () => {
  let repo: InMemoryMenuRepository
  let get: GetMenuByWeekUseCase
  let assign: AssignRecipeToSlotUseCase
  let clear: ClearSlotUseCase

  beforeEach(async () => {
    repo = new InMemoryMenuRepository()
    const recipes = new FakeRecipeFinder().register('recipe-A', 'hh-1')
    let counter = 0
    get = new GetMenuByWeekUseCase(repo, () => `menu-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    assign = new AssignRecipeToSlotUseCase(repo, recipes, () => new Date('2026-05-15T11:00:00Z'))
    clear = new ClearSlotUseCase(repo, () => new Date('2026-05-15T12:00:00Z'))

    await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    await assign.execute({
      householdId: 'hh-1',
      menuId: 'menu-1',
      dayOfWeek: 'monday',
      mealType: 'dinner',
      recipeId: 'recipe-A',
      servings: 2,
    })
  })

  it('clears the slot', async () => {
    await clear.execute({ householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner' })
    const menu = await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    expect(menu.slots).toHaveLength(0)
  })

  it('is a no-op when the slot does not exist (idempotent)', async () => {
    await clear.execute({ householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'tuesday', mealType: 'lunch' })
    const menu = await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    // Monday dinner slot is still here
    expect(menu.slots).toHaveLength(1)
  })

  it('rejects clearing on a menu from another household', async () => {
    await expect(clear.execute({
      householdId: 'hh-2', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner',
    })).rejects.toBeInstanceOf(MenuNotFoundError)
  })
})
