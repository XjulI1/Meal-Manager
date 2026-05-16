import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { ListRecipesUseCase } from '../../../server/contexts/catalog/application/use-cases/list-recipes.use-case'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

const HH = 'hh-1'

describe('ListRecipesUseCase', () => {
  let repo: InMemoryRecipeRepository
  let lookup: InMemoryIngredientLookup
  let create: CreateRecipeUseCase
  let list: ListRecipesUseCase

  beforeEach(async () => {
    repo = new InMemoryRecipeRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-tomato', name: 'Tomate', category: 'produce', canonicalUnit: 'unit', storage: 'fridge', archived: false })
    lookup.add(HH, { id: 'ing-water', name: 'Eau', category: 'beverages', canonicalUnit: 'ml', storage: 'pantry', archived: false })
    lookup.add('hh-2', { id: 'ing-x', name: 'X', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })

    let counter = 0
    create = new CreateRecipeUseCase(repo, lookup, () => `recipe-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    list = new ListRecipesUseCase(repo)

    await create.execute({
      householdId: HH,
      title: 'Pâtes au beurre',
      instructions: '...',
      servings: 2,
      ingredients: [{ ingredientId: 'ing-pasta', quantity: { value: 200, unit: 'g' } }],
    })
    await create.execute({
      householdId: HH,
      title: 'Salade de tomates',
      instructions: '...',
      servings: 2,
      ingredients: [{ ingredientId: 'ing-tomato', quantity: { value: 3, unit: 'unit' } }],
    })
    await create.execute({
      householdId: HH,
      title: 'Soupe',
      instructions: '...',
      servings: 4,
      ingredients: [{ ingredientId: 'ing-water', quantity: { value: 1, unit: 'l' } }],
    })
    await create.execute({
      householdId: 'hh-2',
      title: 'Other household recipe',
      instructions: '...',
      servings: 1,
      ingredients: [{ ingredientId: 'ing-x', quantity: { value: 1, unit: 'g' } }],
    })
  })

  it('lists every recipe of the household (summaries only)', async () => {
    const recipes = await list.execute({ householdId: HH })
    expect(recipes.map((r) => r.title)).toEqual(['Pâtes au beurre', 'Salade de tomates', 'Soupe'])
    for (const r of recipes) {
      expect(r).not.toHaveProperty('instructions')
      expect(r).not.toHaveProperty('ingredients')
    }
  })

  it('filters by case-insensitive substring on the title', async () => {
    const recipes = await list.execute({ householdId: HH, query: 'pâtes' })
    expect(recipes).toHaveLength(1)
    expect(recipes[0]?.title).toBe('Pâtes au beurre')
  })

  it('does not leak recipes from another household', async () => {
    const recipes = await list.execute({ householdId: HH })
    expect(recipes.find((r) => r.title.includes('Other'))).toBeUndefined()
  })
})
