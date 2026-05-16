import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { GetRecipeByIdUseCase } from '../../../server/contexts/catalog/application/use-cases/get-recipe-by-id.use-case'
import { RecipeNotFoundError } from '../../../server/contexts/catalog/domain/errors/recipe-not-found.error'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

const HH = 'hh-1'

describe('GetRecipeByIdUseCase', () => {
  let repo: InMemoryRecipeRepository
  let lookup: InMemoryIngredientLookup
  let get: GetRecipeByIdUseCase

  beforeEach(async () => {
    repo = new InMemoryRecipeRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })

    let counter = 0
    const create = new CreateRecipeUseCase(repo, lookup, () => `recipe-${++counter}`, () => new Date('2026-05-15T10:00:00Z'))
    get = new GetRecipeByIdUseCase(repo, lookup)
    await create.execute({
      householdId: HH,
      title: 'Pâtes au beurre',
      instructions: 'Faire bouillir, ajouter le beurre.',
      servings: 2,
      ingredients: [{ ingredientId: 'ing-pasta', quantity: { value: 200, unit: 'g' } }],
    })
  })

  it('returns full recipe details with resolved ingredient names', async () => {
    const recipe = await get.execute({ householdId: HH, id: 'recipe-1' })
    expect(recipe.title).toBe('Pâtes au beurre')
    expect(recipe.instructions).toBe('Faire bouillir, ajouter le beurre.')
    expect(recipe.ingredients).toHaveLength(1)
    expect(recipe.ingredients[0]?.name).toBe('Pâtes')
    expect(recipe.ingredients[0]?.ingredientId).toBe('ing-pasta')
  })

  it('rejects access from another household', async () => {
    await expect(get.execute({ householdId: 'hh-2', id: 'recipe-1' })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })

  it('rejects unknown recipe id', async () => {
    await expect(get.execute({ householdId: HH, id: 'recipe-999' })).rejects.toBeInstanceOf(RecipeNotFoundError)
  })
})
