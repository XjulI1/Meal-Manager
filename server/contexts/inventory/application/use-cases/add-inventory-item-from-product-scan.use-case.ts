import { ProductNotFoundError } from '../../domain/errors/product-not-found.error'
import type { IProductLookup } from '../../domain/ports/product-lookup.port'
import type {
  AddInventoryItemResult,
  AddInventoryItemUseCase,
} from './add-inventory-item.use-case'

export interface AddInventoryItemFromProductScanInput {
  householdId: string
  productId: string
  quantity: { value: number, unit: string }
  /** Optional override; otherwise resolved from the product's ingredient.storage. */
  location?: string
}

/**
 * Resolves a productId to its ingredient, then delegates to `AddInventoryItemUseCase`
 * so the upsert semantics (one line per `(ingredientId, location)`) apply identically.
 */
export class AddInventoryItemFromProductScanUseCase {
  constructor(
    private readonly products: IProductLookup,
    private readonly add: AddInventoryItemUseCase,
  ) {}

  async execute(input: AddInventoryItemFromProductScanInput): Promise<AddInventoryItemResult> {
    const product = await this.products.findById(input.productId, input.householdId)
    if (!product) {
      throw new ProductNotFoundError(input.productId)
    }

    return this.add.execute({
      householdId: input.householdId,
      ingredientId: product.ingredientId,
      quantity: input.quantity,
      location: input.location,
    })
  }
}
