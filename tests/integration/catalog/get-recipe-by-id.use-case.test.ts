import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { GetRecipeByIdUseCase } from '../../../server/contexts/catalog/application/use-cases/get-recipe-by-id.use-case'
import { RecipeNotFoundError } from '../../../server/contexts/catalog/domain/errors/recipe-not-found.error'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

describe('GetRecipeByIdUseCase', () => {
  let repo: InMemoryRecipeRepository
  let get: GetRecipeByIdUseCase

  beforeEach(async () => {
    repo = new InMemoryRecipeRepository()
    let counter = 0
    const create = new CreateRecipeUseCase(repo, () => `recipe-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    get = new GetRecipeByIdUseCase(repo)
    await create.execute({
      householdId: 'hh-1',
      title: 'Pâtes au beurre',
      instructions: 'Faire bouillir, ajouter le beurre.',
      servings: 2,
      ingredients: [{ name: 'Pâtes', quantity: { value: 200, unit: 'g' } }],
    })
  })

  it('returns full recipe details', async () => {
    const recipe = await get.execute({ householdId: 'hh-1', id: 'recipe-1' })
    expect(recipe.title).toBe('Pâtes au beurre')
    expect(recipe.instructions).toBe('Faire bouillir, ajouter le beurre.')
    expect(recipe.ingredients).toHaveLength(1)
  })

  it('rejects access from another household', async () => {
    await expect(get.execute({ householdId: 'hh-2', id: 'recipe-1' })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })

  it('rejects unknown recipe id', async () => {
    await expect(get.execute({ householdId: 'hh-1', id: 'recipe-999' })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })
})
