import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { ListRecipesUseCase } from '../../../server/contexts/catalog/application/use-cases/list-recipes.use-case'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

describe('ListRecipesUseCase', () => {
  let repo: InMemoryRecipeRepository
  let create: CreateRecipeUseCase
  let list: ListRecipesUseCase

  beforeEach(async () => {
    repo = new InMemoryRecipeRepository()
    let counter = 0
    create = new CreateRecipeUseCase(repo, () => `recipe-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    list = new ListRecipesUseCase(repo)

    await create.execute({
      householdId: 'hh-1',
      title: 'Pâtes au beurre',
      instructions: '...',
      servings: 2,
      ingredients: [{ name: 'Pâtes', quantity: { value: 200, unit: 'g' } }],
    })
    await create.execute({
      householdId: 'hh-1',
      title: 'Salade de tomates',
      instructions: '...',
      servings: 2,
      ingredients: [{ name: 'Tomate', quantity: { value: 3, unit: 'unit' } }],
    })
    await create.execute({
      householdId: 'hh-1',
      title: 'Soupe',
      instructions: '...',
      servings: 4,
      ingredients: [{ name: 'Eau', quantity: { value: 1, unit: 'l' } }],
    })
    await create.execute({
      householdId: 'hh-2',
      title: 'Other household recipe',
      instructions: '...',
      servings: 1,
      ingredients: [{ name: 'X', quantity: { value: 1, unit: 'g' } }],
    })
  })

  it('lists every recipe of the household', async () => {
    const recipes = await list.execute({ householdId: 'hh-1' })
    expect(recipes.map((r) => r.title)).toEqual(['Pâtes au beurre', 'Salade de tomates', 'Soupe'])
    for (const r of recipes) {
      expect(r).not.toHaveProperty('instructions')
      expect(r).not.toHaveProperty('ingredients')
    }
  })

  it('filters by case-insensitive substring on the title', async () => {
    const recipes = await list.execute({ householdId: 'hh-1', query: 'pâtes' })
    expect(recipes).toHaveLength(1)
    expect(recipes[0]?.title).toBe('Pâtes au beurre')
  })

  it('does not leak recipes from another household', async () => {
    const recipes = await list.execute({ householdId: 'hh-1' })
    expect(recipes.find((r) => r.title.includes('Other'))).toBeUndefined()
  })
})
