import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { UpdateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/update-recipe.use-case'
import { RecipeNotFoundError } from '../../../server/contexts/catalog/domain/errors/recipe-not-found.error'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

describe('UpdateRecipeUseCase', () => {
  let repo: InMemoryRecipeRepository
  let create: CreateRecipeUseCase
  let update: UpdateRecipeUseCase

  beforeEach(async () => {
    repo = new InMemoryRecipeRepository()
    let counter = 0
    create = new CreateRecipeUseCase(repo, () => `recipe-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    update = new UpdateRecipeUseCase(repo, () => new Date('2026-05-15T11:00:00Z'))
    await create.execute({
      householdId: 'hh-1',
      title: 'Original',
      instructions: 'Steps',
      servings: 2,
      ingredients: [
        { name: 'A', quantity: { value: 100, unit: 'g' } },
        { name: 'B', quantity: { value: 200, unit: 'g' } },
        { name: 'C', quantity: { value: 300, unit: 'g' } },
      ],
    })
  })

  it('updates only the title', async () => {
    const result = await update.execute({
      householdId: 'hh-1',
      id: 'recipe-1',
      title: 'New title',
    })
    expect(result.title).toBe('New title')
    expect(result.instructions).toBe('Steps')
    expect(result.ingredients).toHaveLength(3)
  })

  it('replaces ingredients atomically', async () => {
    const result = await update.execute({
      householdId: 'hh-1',
      id: 'recipe-1',
      ingredients: [
        { name: 'X', quantity: { value: 50, unit: 'g' } },
        { name: 'Y', quantity: { value: 1, unit: 'kg' } },
      ],
    })
    expect(result.ingredients).toEqual([
      { name: 'X', quantity: { value: 50, unit: 'g' } },
      { name: 'Y', quantity: { value: 1000, unit: 'g' } },
    ])
  })

  it('rejects updates of recipes from another household', async () => {
    await expect(update.execute({
      householdId: 'hh-2',
      id: 'recipe-1',
      title: 'Hijacked',
    })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })

  it('rejects updates of unknown recipes', async () => {
    await expect(update.execute({
      householdId: 'hh-1',
      id: 'recipe-999',
      title: 'Ghost',
    })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })
})
