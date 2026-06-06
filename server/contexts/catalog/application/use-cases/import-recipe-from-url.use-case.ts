import type { IRecipeImporter, RecipeDraft } from '../../domain/ports/recipe-importer'

export interface ImportRecipeFromUrlInput {
  householdId: string
  url: string
}

/**
 * Imports a recipe from a URL into a draft (never persisted). Delegates to the
 * IRecipeImporter port; the adapter handles JSON-LD parsing with a Claude
 * fallback. A RecipeImportError surfaces as HTTP 400 at the transport layer.
 */
export class ImportRecipeFromUrlUseCase {
  constructor(private readonly importer: IRecipeImporter) {}

  async execute(input: ImportRecipeFromUrlInput): Promise<RecipeDraft> {
    return this.importer.importFromUrl(input.url)
  }
}
