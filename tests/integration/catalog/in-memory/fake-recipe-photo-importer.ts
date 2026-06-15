import type { RecipeDraft } from '../../../../server/contexts/catalog/domain/ports/recipe-importer'
import type { IRecipePhotoImporter, RecipeImageInput } from '../../../../server/contexts/catalog/domain/ports/recipe-photo-importer'

/** In-memory fake photo importer: returns a fixed draft or throws a fixed error. */
export class FakeRecipePhotoImporter implements IRecipePhotoImporter {
  lastImages?: ReadonlyArray<RecipeImageInput>

  constructor(private readonly result: RecipeDraft | Error) {}

  async importFromPhotos(images: ReadonlyArray<RecipeImageInput>): Promise<RecipeDraft> {
    this.lastImages = images
    if (this.result instanceof Error) throw this.result
    return this.result
  }
}
