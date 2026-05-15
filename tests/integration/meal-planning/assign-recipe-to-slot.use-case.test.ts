import { beforeEach, describe, expect, it } from 'vitest'
import { AssignRecipeToSlotUseCase } from '../../../server/contexts/meal-planning/application/use-cases/assign-recipe-to-slot.use-case'
import { GetMenuByWeekUseCase } from '../../../server/contexts/meal-planning/application/use-cases/get-menu-by-week.use-case'
import { MenuNotFoundError } from '../../../server/contexts/meal-planning/domain/errors/menu-not-found.error'
import { RecipeNotInHouseholdError } from '../../../server/contexts/meal-planning/domain/errors/recipe-not-in-household.error'
import { InvalidDayOfWeekError } from '../../../server/contexts/meal-planning/domain/value-objects/day-of-week.vo'
import { InvalidMealTypeError } from '../../../server/contexts/meal-planning/domain/value-objects/meal-type.vo'
import { FakeRecipeFinder } from './in-memory/fake-recipe-finder'
import { InMemoryMenuRepository } from './in-memory/in-memory-menu.repository'

describe('AssignRecipeToSlotUseCase', () => {
  let repo: InMemoryMenuRepository
  let recipes: FakeRecipeFinder
  let get: GetMenuByWeekUseCase
  let assign: AssignRecipeToSlotUseCase

  beforeEach(async () => {
    repo = new InMemoryMenuRepository()
    recipes = new FakeRecipeFinder()
    let counter = 0
    get = new GetMenuByWeekUseCase(repo, () => `menu-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    assign = new AssignRecipeToSlotUseCase(repo, recipes, () => new Date('2026-05-15T11:00:00Z'))
    await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    recipes.register('recipe-A', 'hh-1')
    recipes.register('recipe-B', 'hh-1')
    recipes.register('recipe-other', 'hh-2')
  })

  it('assigns a recipe to an empty slot', async () => {
    const slot = await assign.execute({
      householdId: 'hh-1',
      menuId: 'menu-1',
      dayOfWeek: 'monday',
      mealType: 'dinner',
      recipeId: 'recipe-A',
      servings: 4,
    })
    expect(slot).toEqual({ dayOfWeek: 'monday', mealType: 'dinner', recipeId: 'recipe-A', servings: 4 })

    const refreshed = await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    expect(refreshed.slots).toHaveLength(1)
  })

  it('replaces an existing slot (same day+meal)', async () => {
    await assign.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', recipeId: 'recipe-A', servings: 2,
    })
    await assign.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', recipeId: 'recipe-B', servings: 4,
    })

    const refreshed = await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    expect(refreshed.slots).toHaveLength(1)
    expect(refreshed.slots[0]).toEqual({ dayOfWeek: 'monday', mealType: 'dinner', recipeId: 'recipe-B', servings: 4 })
  })

  it('rejects assigning a recipe from another household', async () => {
    await expect(assign.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', recipeId: 'recipe-other', servings: 2,
    })).rejects.toBeInstanceOf(RecipeNotInHouseholdError)
  })

  it('rejects assigning to a menu from another household', async () => {
    await expect(assign.execute({
      householdId: 'hh-2', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', recipeId: 'recipe-other', servings: 2,
    })).rejects.toBeInstanceOf(MenuNotFoundError)
  })

  it('rejects an invalid mealType', async () => {
    await expect(assign.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'snack', recipeId: 'recipe-A', servings: 2,
    })).rejects.toBeInstanceOf(InvalidMealTypeError)
  })

  it('rejects an invalid dayOfWeek', async () => {
    await expect(assign.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'funday', mealType: 'dinner', recipeId: 'recipe-A', servings: 2,
    })).rejects.toBeInstanceOf(InvalidDayOfWeekError)
  })

  it('rejects zero or non-integer servings', async () => {
    await expect(assign.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', recipeId: 'recipe-A', servings: 0,
    })).rejects.toThrow(/servings must be an integer/i)

    await expect(assign.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', recipeId: 'recipe-A', servings: 1.5,
    })).rejects.toThrow(/servings must be an integer/i)
  })
})
