/**
 * Future-proofing port for importing a recipe from a URL (a recipe site,
 * a JSON-LD page, …). v1 has no implementation; the interface exists so
 * adapters can be plugged later without touching the domain.
 */
export interface RecipeIngredientDraft {
  name: string
  quantity?: { value: number, unit: string }
  raw?: string
}

export interface RecipeDraftContent {
  title: string
  instructions: string
  servings?: number
  ingredients: ReadonlyArray<RecipeIngredientDraft>
  sourceUrl?: string
}

export interface IRecipeImporter {
  importFromUrl(url: string): Promise<RecipeDraftContent>
}
