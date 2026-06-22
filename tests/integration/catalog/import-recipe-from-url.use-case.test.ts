import { describe, expect, it } from 'vitest'
import { ImportRecipeFromUrlUseCase } from '../../../server/contexts/catalog/application/use-cases/import-recipe-from-url.use-case'
import { RecipeImportError } from '../../../server/contexts/catalog/domain/errors/recipe-import.error'
import type { RecipeDraftContent } from '../../../server/contexts/catalog/domain/ports/recipe-importer'
import { FakeRecipeImporter } from './in-memory/fake-recipe-importer'

describe('ImportRecipeFromUrlUseCase', () => {
  it('returns the draft produced by the importer for the given URL', async () => {
    const draft: RecipeDraftContent = {
      title: 'Tarte aux pommes',
      instructions: 'Cuire 30 min',
      ingredients: [{ name: 'Pommes', quantity: { value: 4, unit: 'unit' } }],
      sourceUrl: 'https://example.com/tarte',
    }
    const importer = new FakeRecipeImporter(draft)
    const useCase = new ImportRecipeFromUrlUseCase(importer)

    const result = await useCase.execute({ householdId: 'hh-1', url: 'https://example.com/tarte' })

    expect(result).toEqual(draft)
    expect(importer.lastUrl).toBe('https://example.com/tarte')
  })

  it('propagates a RecipeImportError when the import fails', async () => {
    const useCase = new ImportRecipeFromUrlUseCase(new FakeRecipeImporter(new RecipeImportError('unreachable')))
    await expect(useCase.execute({ householdId: 'hh-1', url: 'https://bad.example' })).rejects.toBeInstanceOf(RecipeImportError)
  })
})
