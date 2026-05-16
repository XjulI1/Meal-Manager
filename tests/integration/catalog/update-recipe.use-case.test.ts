import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { UpdateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/update-recipe.use-case'
import { InvalidIngredientReferenceError } from '../../../server/contexts/catalog/domain/errors/invalid-ingredient-reference.error'
import { RecipeNotFoundError } from '../../../server/contexts/catalog/domain/errors/recipe-not-found.error'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

const HH = 'hh-1'

describe('UpdateRecipeUseCase', () => {
  let repo: InMemoryRecipeRepository
  let lookup: InMemoryIngredientLookup
  let create: CreateRecipeUseCase
  let update: UpdateRecipeUseCase

  beforeEach(async () => {
    repo = new InMemoryRecipeRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-a', name: 'A', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-b', name: 'B', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-c', name: 'C', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-x', name: 'X', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-y', name: 'Y', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })

    let counter = 0
    create = new CreateRecipeUseCase(repo, lookup, () => `recipe-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    update = new UpdateRecipeUseCase(repo, lookup, () => new Date('2026-05-15T11:00:00Z'))
    await create.execute({
      householdId: HH,
      title: 'Original',
      instructions: 'Steps',
      servings: 2,
      ingredients: [
        { ingredientId: 'ing-a', quantity: { value: 100, unit: 'g' } },
        { ingredientId: 'ing-b', quantity: { value: 200, unit: 'g' } },
        { ingredientId: 'ing-c', quantity: { value: 300, unit: 'g' } },
      ],
    })
  })

  it('updates only the title and preserves the ingredients', async () => {
    const result = await update.execute({
      householdId: HH,
      id: 'recipe-1',
      title: 'New title',
    })
    expect(result.title).toBe('New title')
    expect(result.instructions).toBe('Steps')
    expect(result.ingredients).toHaveLength(3)
    expect(result.ingredients[0]?.name).toBe('A')
  })

  it('replaces ingredients atomically', async () => {
    const result = await update.execute({
      householdId: HH,
      id: 'recipe-1',
      ingredients: [
        { ingredientId: 'ing-x', quantity: { value: 50, unit: 'g' } },
        { ingredientId: 'ing-y', quantity: { value: 1, unit: 'kg' } },
      ],
    })
    expect(result.ingredients).toEqual([
      { ingredientId: 'ing-x', name: 'X', quantity: { value: 50, unit: 'g' } },
      { ingredientId: 'ing-y', name: 'Y', quantity: { value: 1000, unit: 'g' } },
    ])
  })

  it('rejects ingredient replacement with an unknown id', async () => {
    await expect(update.execute({
      householdId: HH,
      id: 'recipe-1',
      ingredients: [{ ingredientId: 'ing-unknown', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
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
      householdId: HH,
      id: 'recipe-999',
      title: 'Ghost',
    })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })
})
