import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { DeleteRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/delete-recipe.use-case'
import { RecipeNotFoundError } from '../../../server/contexts/catalog/domain/errors/recipe-not-found.error'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

describe('DeleteRecipeUseCase', () => {
  let repo: InMemoryRecipeRepository
  let create: CreateRecipeUseCase
  let del: DeleteRecipeUseCase

  beforeEach(async () => {
    repo = new InMemoryRecipeRepository()
    let counter = 0
    create = new CreateRecipeUseCase(repo, () => `recipe-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    del = new DeleteRecipeUseCase(repo)
    await create.execute({
      householdId: 'hh-1',
      title: 'To be removed',
      instructions: '...',
      servings: 1,
      ingredients: [{ name: 'X', quantity: { value: 1, unit: 'g' } }],
    })
  })

  it('deletes an existing recipe (and signals cascade to menu slots)', async () => {
    await del.execute({ householdId: 'hh-1', id: 'recipe-1' })
    expect(await repo.findById('recipe-1', 'hh-1')).toBeNull()
    expect(repo.deletedSlotRecipeIds.has('recipe-1')).toBe(true)
  })

  it('rejects deletion of a recipe from another household', async () => {
    await expect(del.execute({ householdId: 'hh-2', id: 'recipe-1' })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })

  it('rejects deletion of an unknown recipe', async () => {
    await expect(del.execute({ householdId: 'hh-1', id: 'recipe-999' })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })
})
