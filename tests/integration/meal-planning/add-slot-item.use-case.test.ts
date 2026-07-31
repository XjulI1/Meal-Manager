import { beforeEach, describe, expect, it } from 'vitest'
import { AddSlotItemUseCase } from '../../../server/contexts/meal-planning/application/use-cases/add-slot-item.use-case'
import { GetMenuByWeekUseCase } from '../../../server/contexts/meal-planning/application/use-cases/get-menu-by-week.use-case'
import { InvalidIngredientReferenceError } from '../../../server/contexts/meal-planning/domain/errors/invalid-ingredient-reference.error'
import { MenuNotFoundError } from '../../../server/contexts/meal-planning/domain/errors/menu-not-found.error'
import { MultipleRecipesInSlotError } from '../../../server/contexts/meal-planning/domain/errors/multiple-recipes-in-slot.error'
import { RecipeNotInHouseholdError } from '../../../server/contexts/meal-planning/domain/errors/recipe-not-in-household.error'
import { InvalidDayOfWeekError } from '../../../server/contexts/meal-planning/domain/value-objects/day-of-week.vo'
import { InvalidMealTypeError } from '../../../server/contexts/meal-planning/domain/value-objects/meal-type.vo'
import { FakeIngredientLookup } from './in-memory/fake-ingredient-lookup'
import { FakeRecipeFinder } from './in-memory/fake-recipe-finder'
import { InMemoryMenuRepository } from './in-memory/in-memory-menu.repository'

describe('AddSlotItemUseCase', () => {
  let repo: InMemoryMenuRepository
  let recipes: FakeRecipeFinder
  let ingredients: FakeIngredientLookup
  let get: GetMenuByWeekUseCase
  let add: AddSlotItemUseCase

  beforeEach(async () => {
    repo = new InMemoryMenuRepository()
    recipes = new FakeRecipeFinder()
    ingredients = new FakeIngredientLookup()
    let counter = 0
    get = new GetMenuByWeekUseCase(repo, () => `menu-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    let itemCounter = 0
    add = new AddSlotItemUseCase(repo, recipes, ingredients, () => `item-${++itemCounter}`, () => new Date('2026-05-15T11:00:00Z'))
    await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    recipes.register('recipe-A', 'hh-1')
    recipes.register('recipe-B', 'hh-1')
    recipes.register('recipe-other', 'hh-2')
    ingredients.register({ id: 'ing-bread', name: 'Pain', category: 'bakery', canonicalUnit: 'g', storage: 'pantry', archived: false, householdId: 'hh-1' })
    ingredients.register({ id: 'ing-salad', name: 'Salade', category: 'produce', canonicalUnit: 'unit', storage: 'fridge', archived: false, householdId: 'hh-1' })
    ingredients.register({ id: 'ing-archived', name: 'Vieux', category: 'other', canonicalUnit: 'g', storage: 'pantry', archived: true, householdId: 'hh-1' })
    ingredients.register({ id: 'ing-other-hh', name: 'Autre', category: 'other', canonicalUnit: 'g', storage: 'pantry', archived: false, householdId: 'hh-2' })
  })

  it('assigns a recipe to an empty slot', async () => {
    const slot = await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-A', servings: 4,
    })
    expect(slot.items).toEqual([{ id: 'item-1', kind: 'recipe', recipeId: 'recipe-A', servings: 4 }])

    const refreshed = await get.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    expect(refreshed.slots).toHaveLength(1)
  })

  it('replaces the recipe item, keeping free ingredients', async () => {
    await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-A', servings: 2,
    })
    await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 300, unit: 'g' },
    })
    const slot = await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-B', servings: 4,
    })

    expect(slot.items).toHaveLength(2)
    const recipeItem = slot.items.find((i) => i.kind === 'recipe')
    expect(recipeItem).toMatchObject({ recipeId: 'recipe-B', servings: 4 })
    const ingredientItem = slot.items.find((i) => i.kind === 'ingredient')
    expect(ingredientItem).toMatchObject({ ingredientId: 'ing-bread', quantity: { value: 300, unit: 'g' } })
  })

  it('adds a free ingredient to an empty slot', async () => {
    const slot = await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 300, unit: 'g' },
    })
    expect(slot.items).toEqual([{ id: 'item-1', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 300, unit: 'g' } }])
  })

  it('sums quantities when the same ingredient is added twice', async () => {
    await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 300, unit: 'g' },
    })
    const slot = await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 200, unit: 'g' },
    })
    expect(slot.items).toEqual([{ id: 'item-1', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 500, unit: 'g' } }])
  })

  it('mixes a recipe and several free ingredients in one slot', async () => {
    await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-A', servings: 4,
    })
    await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 300, unit: 'g' },
    })
    const slot = await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-salad', quantity: { value: 1, unit: 'unit' },
    })
    expect(slot.items).toHaveLength(3)
  })

  it('rejects assigning a recipe from another household', async () => {
    await expect(add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-other', servings: 2,
    })).rejects.toBeInstanceOf(RecipeNotInHouseholdError)
  })

  it('rejects adding to a menu from another household', async () => {
    await expect(add.execute({
      householdId: 'hh-2', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-other', servings: 2,
    })).rejects.toBeInstanceOf(MenuNotFoundError)
  })

  it('rejects an invalid mealType', async () => {
    await expect(add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'snack', kind: 'recipe', recipeId: 'recipe-A', servings: 2,
    })).rejects.toBeInstanceOf(InvalidMealTypeError)
  })

  it('rejects an invalid dayOfWeek', async () => {
    await expect(add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'funday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-A', servings: 2,
    })).rejects.toBeInstanceOf(InvalidDayOfWeekError)
  })

  it('rejects zero or non-integer servings', async () => {
    await expect(add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-A', servings: 0,
    })).rejects.toThrow(/servings must be an integer/i)
  })

  it('rejects a free ingredient from another household (not found)', async () => {
    await expect(add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-other-hh', quantity: { value: 1, unit: 'g' },
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects an archived ingredient', async () => {
    await expect(add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-archived', quantity: { value: 1, unit: 'g' },
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects an incompatible unit', async () => {
    await expect(add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 1, unit: 'l' },
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('never surfaces MultipleRecipesInSlotError — replacing a recipe always removes the previous one first', async () => {
    await add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-A', servings: 2,
    })
    await expect(add.execute({
      householdId: 'hh-1', menuId: 'menu-1', dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: 'recipe-B', servings: 4,
    })).resolves.not.toThrow(MultipleRecipesInSlotError)
  })
})
