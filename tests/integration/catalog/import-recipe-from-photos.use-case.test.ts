import { describe, expect, it } from 'vitest'
import { ImportRecipeFromPhotosUseCase } from '../../../server/contexts/catalog/application/use-cases/import-recipe-from-photos.use-case'
import { RecipePhotoImportError } from '../../../server/contexts/catalog/domain/errors/recipe-photo-import.error'
import type { RecipeDraft } from '../../../server/contexts/catalog/domain/ports/recipe-importer'
import { FakeRecipePhotoImporter } from './in-memory/fake-recipe-photo-importer'

describe('ImportRecipeFromPhotosUseCase', () => {
  it('returns the draft produced by the importer for the given images', async () => {
    const draft: RecipeDraft = {
      title: 'Gâteau au yaourt',
      instructions: 'Mélanger puis cuire 35 min',
      servings: 6,
      ingredients: [{ name: 'Yaourt', quantity: { value: 1, unit: 'unit' } }],
    }
    const importer = new FakeRecipePhotoImporter(draft)
    const useCase = new ImportRecipeFromPhotosUseCase(importer)
    const images = [{ mediaType: 'image/jpeg', data: 'AAAA' }]

    const result = await useCase.execute({ householdId: 'hh-1', images })

    expect(result).toEqual(draft)
    expect(importer.lastImages).toEqual(images)
  })

  it('propagates a RecipePhotoImportError when extraction fails', async () => {
    const useCase = new ImportRecipeFromPhotosUseCase(
      new FakeRecipePhotoImporter(new RecipePhotoImportError('illisible')),
    )
    await expect(
      useCase.execute({ householdId: 'hh-1', images: [{ mediaType: 'image/png', data: 'BBBB' }] }),
    ).rejects.toBeInstanceOf(RecipePhotoImportError)
  })
})
