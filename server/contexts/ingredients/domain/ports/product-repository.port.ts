import type { Product } from '../entities/product.entity'

export interface IProductRepository {
  findById(id: string, householdId: string): Promise<Product | null>

  findByIngredient(ingredientId: string, householdId: string): Promise<Product[]>

  /** Look up the product owning the given barcode within the household. */
  findByBarcodeInHousehold(barcode: string, householdId: string): Promise<Product | null>

  /**
   * Returns the set of barcodes (among the candidates) that are already
   * attached to ANY OTHER product in the household. Used to enforce
   * household-wide barcode uniqueness on create/update.
   */
  findDuplicateBarcodesInHousehold(
    candidates: readonly string[],
    householdId: string,
    excludeProductId?: string,
  ): Promise<string[]>

  save(product: Product): Promise<void>

  delete(id: string, householdId: string): Promise<void>
}
