import type { RecipeDraft } from './recipe-importer'

/** Minimal shape the catalog needs to know about an available inventory item. */
export interface AvailableIngredient {
  name: string
  quantity: { value: number, unit: 'g' | 'ml' | 'unit' }
}

/**
 * Future-proofing port for AI-backed recipe generation from the current
 * inventory. v1 has no implementation; the interface exists so adapters
 * can be plugged later without touching the domain.
 */
export interface IRecipeGenerator {
  generateFromAvailableIngredients(inventory: AvailableIngredient[]): Promise<RecipeDraft[]>
}
