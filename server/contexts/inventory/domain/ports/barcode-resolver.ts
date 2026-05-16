/**
 * Port for barcode scanning. Multiple adapters may be registered in the
 * composition root (currently the in-household catalog via `IngredientBarcodeResolver`;
 * future external sources like OpenFoodFacts).
 */
export interface BarcodeResolution {
  name: string
  defaultUnit?: string
  ingredientId?: string
  productId?: string
  storage?: 'pantry' | 'fridge'
  category?: string
}

export interface IBarcodeResolver {
  resolve(barcode: string, householdId: string): Promise<BarcodeResolution | null>
}
