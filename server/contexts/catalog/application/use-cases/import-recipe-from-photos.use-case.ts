import type { RecipeDraft } from '../../domain/ports/recipe-importer'
import type { IRecipePhotoImporter, RecipeImageInput } from '../../domain/ports/recipe-photo-importer'

export interface ImportRecipeFromPhotosInput {
  householdId: string
  images: ReadonlyArray<RecipeImageInput>
}

/**
 * Imports a recipe from one or more photos into a draft (never persisted).
 * Delegates to the IRecipePhotoImporter port; the adapter calls the Anthropic
 * vision API. A RecipePhotoImportError surfaces as HTTP 400 at the transport
 * layer. The draft then flows through the existing resolution + form pre-fill.
 */
export class ImportRecipeFromPhotosUseCase {
  constructor(private readonly importer: IRecipePhotoImporter) {}

  async execute(input: ImportRecipeFromPhotosInput): Promise<RecipeDraft> {
    return this.importer.importFromPhotos(input.images)
  }
}
