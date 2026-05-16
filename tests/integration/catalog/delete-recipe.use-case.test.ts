import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { DeleteRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/delete-recipe.use-case'
import { RecipeNotFoundError } from '../../../server/contexts/catalog/domain/errors/recipe-not-found.error'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

const HH = 'hh-1'

describe('DeleteRecipeUseCase', () => {
  let repo: InMemoryRecipeRepository
  let lookup: InMemoryIngredientLookup
  let create: CreateRecipeUseCase
  let del: DeleteRecipeUseCase

  beforeEach(async () => {
    repo = new InMemoryRecipeRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-x', name: 'X', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })

    let counter = 0
    create = new CreateRecipeUseCase(repo, lookup, () => `recipe-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    del = new DeleteRecipeUseCase(repo)
    await create.execute({
      householdId: HH,
      title: 'To be removed',
      instructions: '...',
      servings: 1,
      ingredients: [{ ingredientId: 'ing-x', quantity: { value: 1, unit: 'g' } }],
    })
  })

  it('deletes an existing recipe (and signals cascade to menu slots)', async () => {
    await del.execute({ householdId: HH, id: 'recipe-1' })
    expect(await repo.findById('recipe-1', HH)).toBeNull()
    expect(repo.deletedSlotRecipeIds.has('recipe-1')).toBe(true)
  })

  it('rejects deletion of a recipe from another household', async () => {
    await expect(del.execute({ householdId: 'hh-2', id: 'recipe-1' })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })

  it('rejects deletion of an unknown recipe', async () => {
    await expect(del.execute({ householdId: HH, id: 'recipe-999' })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })
})
