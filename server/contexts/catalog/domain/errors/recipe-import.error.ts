/** Raised when a recipe cannot be imported from a URL (unreachable, no parsable
 *  recipe data, extraction failed). Mapped to HTTP 400 at the transport layer. */
export class RecipeImportError extends Error {
  override readonly name = 'RecipeImportError'
}
