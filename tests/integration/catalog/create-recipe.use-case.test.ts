import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { InvalidIngredientReferenceError } from '../../../server/contexts/catalog/domain/errors/invalid-ingredient-reference.error'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

const HH = 'hh-1'

describe('CreateRecipeUseCase', () => {
  let repo: InMemoryRecipeRepository
  let lookup: InMemoryIngredientLookup
  let create: CreateRecipeUseCase

  beforeEach(() => {
    repo = new InMemoryRecipeRepository()
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-butter', name: 'Beurre', category: 'dairy', canonicalUnit: 'g', storage: 'fridge', archived: false })
    lookup.add(HH, { id: 'ing-flour', name: 'Farine', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-water', name: 'Eau', category: 'beverages', canonicalUnit: 'ml', storage: 'pantry', archived: false })
    lookup.add(HH, { id: 'ing-archived', name: 'Archivé', category: 'other', canonicalUnit: 'g', storage: 'pantry', archived: true })

    let counter = 0
    create = new CreateRecipeUseCase(
      repo,
      lookup,
      () => `recipe-${++counter}`,
      () => new Date('2026-05-15T10:00:00Z'),
    )
  })

  it('creates a recipe with ingredients normalized to canonical units and resolved names', async () => {
    const result = await create.execute({
      householdId: HH,
      title: 'Pâtes au beurre',
      instructions: 'Faire bouillir, ajouter le beurre.',
      servings: 2,
      ingredients: [
        { ingredientId: 'ing-pasta', quantity: { value: 200, unit: 'g' } },
        { ingredientId: 'ing-butter', quantity: { value: 30, unit: 'g' } },
      ],
    })

    expect(result.id).toBe('recipe-1')
    expect(result.title).toBe('Pâtes au beurre')
    expect(result.servings).toBe(2)
    expect(result.ingredients).toEqual([
      { ingredientId: 'ing-pasta', name: 'Pâtes', quantity: { value: 200, unit: 'g' } },
      { ingredientId: 'ing-butter', name: 'Beurre', quantity: { value: 30, unit: 'g' } },
    ])
  })

  it('converts ingredient units (kg → g, l → ml)', async () => {
    const result = await create.execute({
      householdId: HH,
      title: 'Test',
      instructions: 'Mélanger.',
      servings: 4,
      ingredients: [
        { ingredientId: 'ing-flour', quantity: { value: 1, unit: 'kg' } },
        { ingredientId: 'ing-water', quantity: { value: 1, unit: 'l' } },
      ],
    })

    expect(result.ingredients).toEqual([
      { ingredientId: 'ing-flour', name: 'Farine', quantity: { value: 1000, unit: 'g' } },
      { ingredientId: 'ing-water', name: 'Eau', quantity: { value: 1000, unit: 'ml' } },
    ])
  })

  it('rejects an empty ingredients list', async () => {
    await expect(create.execute({
      householdId: HH,
      title: 'No ingredients',
      instructions: 'Step',
      servings: 1,
      ingredients: [],
    })).rejects.toThrow(/at least 1 ingredient/i)
  })

  it('rejects zero servings', async () => {
    await expect(create.execute({
      householdId: HH,
      title: 'Zero',
      instructions: 'Step',
      servings: 0,
      ingredients: [{ ingredientId: 'ing-pasta', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toThrow(/servings must be an integer/i)
  })

  it('rejects non-integer servings', async () => {
    await expect(create.execute({
      householdId: HH,
      title: 'Half',
      instructions: 'Step',
      servings: 1.5,
      ingredients: [{ ingredientId: 'ing-pasta', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toThrow(/servings must be an integer/i)
  })

  it('trims the title and rejects an empty title', async () => {
    await expect(create.execute({
      householdId: HH,
      title: '   ',
      instructions: 'Step',
      servings: 1,
      ingredients: [{ ingredientId: 'ing-pasta', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toThrow(/title must not be empty/i)
  })

  it('rejects an unknown ingredientId', async () => {
    await expect(create.execute({
      householdId: HH,
      title: 'X',
      instructions: 'Step',
      servings: 1,
      ingredients: [{ ingredientId: 'ing-unknown', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects an ingredient from another household', async () => {
    await expect(create.execute({
      householdId: 'hh-2',
      title: 'X',
      instructions: 'Step',
      servings: 1,
      ingredients: [{ ingredientId: 'ing-pasta', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects an archived ingredient', async () => {
    await expect(create.execute({
      householdId: HH,
      title: 'X',
      instructions: 'Step',
      servings: 1,
      ingredients: [{ ingredientId: 'ing-archived', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })

  it('rejects an incompatible unit dimension', async () => {
    await expect(create.execute({
      householdId: HH,
      title: 'X',
      instructions: 'Step',
      servings: 1,
      ingredients: [{ ingredientId: 'ing-pasta', quantity: { value: 1, unit: 'ml' } }],
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })
})
