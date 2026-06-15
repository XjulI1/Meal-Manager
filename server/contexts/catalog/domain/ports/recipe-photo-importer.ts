import type { RecipeDraft } from './recipe-importer'

/**
 * Port for importing a recipe from one or more photos (a cookbook page, a
 * handwritten card, …). All provided images describe the SAME recipe and are
 * interpreted together. The v1 implementation uses the Anthropic vision API.
 *
 * Kept separate from `IRecipeImporter` (URL) so each port models a single,
 * homogeneous source. The result is always a draft (never persisted) and, being
 * a paper recipe, carries no `sourceUrl`.
 */
export interface RecipeImageInput {
  /** MIME type — the transport restricts this to image/jpeg|png|webp. */
  mediaType: string
  /** Image bytes encoded as base64 (no `data:` prefix). */
  data: string
}

export interface IRecipePhotoImporter {
  importFromPhotos(images: ReadonlyArray<RecipeImageInput>): Promise<RecipeDraft>
}
