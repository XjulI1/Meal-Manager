import type { Product } from '../../../../server/contexts/ingredients/domain/entities/product.entity'
import type { IProductRepository } from '../../../../server/contexts/ingredients/domain/ports/product-repository.port'

export class InMemoryProductRepository implements IProductRepository {
  private readonly store = new Map<string, Product>()

  async findById(id: string, householdId: string): Promise<Product | null> {
    const p = this.store.get(id)
    return p && p.householdId === householdId ? p : null
  }

  async findByIngredient(ingredientId: string, householdId: string): Promise<Product[]> {
    return Array.from(this.store.values()).filter(
      (p) => p.householdId === householdId && p.ingredientId === ingredientId,
    )
  }

  async findByBarcodeInHousehold(barcode: string, householdId: string): Promise<Product | null> {
    for (const p of this.store.values()) {
      if (p.householdId !== householdId) continue
      if (p.barcodes.some((b) => b.value === barcode)) return p
    }
    return null
  }

  async findDuplicateBarcodesInHousehold(
    candidates: readonly string[],
    householdId: string,
    excludeProductId?: string,
  ): Promise<string[]> {
    const set = new Set<string>()
    const candidateSet = new Set(candidates)
    for (const p of this.store.values()) {
      if (p.householdId !== householdId) continue
      if (excludeProductId && p.id === excludeProductId) continue
      for (const b of p.barcodes) {
        if (candidateSet.has(b.value)) set.add(b.value)
      }
    }
    return Array.from(set)
  }

  async save(product: Product): Promise<void> {
    this.store.set(product.id, product)
  }

  async delete(id: string, householdId: string): Promise<void> {
    const p = this.store.get(id)
    if (p && p.householdId === householdId) this.store.delete(id)
  }

  // Test helpers
  size(): number {
    return this.store.size
  }
}
