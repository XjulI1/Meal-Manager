/** Raised when a recipe cannot be imported from photos (unreadable image, no
 *  parsable recipe content, extraction failed). Mapped to HTTP 400 at the
 *  transport layer. */
export class RecipePhotoImportError extends Error {
  override readonly name = 'RecipePhotoImportError'
}
