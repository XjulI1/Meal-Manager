import type {
  IProductLookup,
  ProductSummary,
} from '../../../../server/contexts/inventory/domain/ports/product-lookup.port'

/**
 * In-memory fake of `IProductLookup`, scoped by household. Used by
 * `AddInventoryItemFromProductScanUseCase` integration tests without spinning
 * up the ingredients catalog.
 */
export class InMemoryProductLookup implements IProductLookup {
  private readonly store = new Map<string, ProductSummary>()

  add(householdId: string, summary: ProductSummary): void {
    this.store.set(`${householdId}|${summary.id}`, summary)
  }

  async findById(productId: string, householdId: string): Promise<ProductSummary | null> {
    return this.store.get(`${householdId}|${productId}`) ?? null
  }
}
