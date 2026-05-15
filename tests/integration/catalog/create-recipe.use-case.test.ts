import { beforeEach, describe, expect, it } from 'vitest'
import { CreateRecipeUseCase } from '../../../server/contexts/catalog/application/use-cases/create-recipe.use-case'
import { InMemoryRecipeRepository } from './in-memory/in-memory-recipe.repository'

describe('CreateRecipeUseCase', () => {
  let repo: InMemoryRecipeRepository
  let create: CreateRecipeUseCase

  beforeEach(() => {
    repo = new InMemoryRecipeRepository()
    let counter = 0
    create = new CreateRecipeUseCase(
      repo,
      () => `recipe-${++counter}`,
      () => new Date('2026-05-15T10:00:00Z'),
    )
  })

  it('creates a recipe with ingredients normalized to canonical units', async () => {
    const result = await create.execute({
      householdId: 'hh-1',
      title: 'Pâtes au beurre',
      instructions: 'Faire bouillir, ajouter le beurre.',
      servings: 2,
      ingredients: [
        { name: 'Pâtes', quantity: { value: 200, unit: 'g' } },
        { name: 'Beurre', quantity: { value: 30, unit: 'g' } },
      ],
    })

    expect(result.id).toBe('recipe-1')
    expect(result.title).toBe('Pâtes au beurre')
    expect(result.servings).toBe(2)
    expect(result.ingredients).toEqual([
      { name: 'Pâtes', quantity: { value: 200, unit: 'g' } },
      { name: 'Beurre', quantity: { value: 30, unit: 'g' } },
    ])
  })

  it('converts ingredient units (kg → g, l → ml)', async () => {
    const result = await create.execute({
      householdId: 'hh-1',
      title: 'Test',
      instructions: 'Mélanger.',
      servings: 4,
      ingredients: [
        { name: 'Farine', quantity: { value: 1, unit: 'kg' } },
        { name: 'Eau', quantity: { value: 1, unit: 'l' } },
      ],
    })

    expect(result.ingredients).toEqual([
      { name: 'Farine', quantity: { value: 1000, unit: 'g' } },
      { name: 'Eau', quantity: { value: 1000, unit: 'ml' } },
    ])
  })

  it('rejects an empty ingredients list', async () => {
    await expect(create.execute({
      householdId: 'hh-1',
      title: 'No ingredients',
      instructions: 'Step',
      servings: 1,
      ingredients: [],
    })).rejects.toThrow(/at least 1 ingredient/i)
  })

  it('rejects zero servings', async () => {
    await expect(create.execute({
      householdId: 'hh-1',
      title: 'Zero',
      instructions: 'Step',
      servings: 0,
      ingredients: [{ name: 'X', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toThrow(/servings must be an integer/i)
  })

  it('rejects non-integer servings', async () => {
    await expect(create.execute({
      householdId: 'hh-1',
      title: 'Half',
      instructions: 'Step',
      servings: 1.5,
      ingredients: [{ name: 'X', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toThrow(/servings must be an integer/i)
  })

  it('trims the title and rejects an empty title', async () => {
    await expect(create.execute({
      householdId: 'hh-1',
      title: '   ',
      instructions: 'Step',
      servings: 1,
      ingredients: [{ name: 'X', quantity: { value: 1, unit: 'g' } }],
    })).rejects.toThrow(/title must not be empty/i)
  })
})
