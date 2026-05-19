import type {
  IProductLookup,
  ProductSummary,
} from '../../inventory/domain/ports/product-lookup.port'
import type { IProductRepository } from '../domain/ports/product-repository.port'

/**
 * Adapter implementing the inventory `IProductLookup` port by querying the
 * ingredients catalog. Registered in the composition root so cross-context
 * callers (inventory use cases) never import from `~/server/contexts/ingredients/**`.
 */
export class ProductLookupAdapter implements IProductLookup {
  constructor(private readonly products: IProductRepository) {}

  async findById(productId: string, householdId: string): Promise<ProductSummary | null> {
    const product = await this.products.findById(productId, householdId)
    if (!product) return null
    return {
      id: product.id,
      ingredientId: product.ingredientId,
      packSize: product.packSize,
      packUnit: product.packUnit,
    }
  }
}
