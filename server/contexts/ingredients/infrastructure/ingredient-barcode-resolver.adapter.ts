import type {
  BarcodeResolution,
  IBarcodeResolver,
} from '../../inventory/domain/ports/barcode-resolver'
import type { ResolveByBarcodeUseCase } from '../application/use-cases/resolve-by-barcode.use-case'

/**
 * Implements the `IBarcodeResolver` port declared in `inventory/` by
 * delegating to the in-household ingredient catalog. Registered in the
 * composition root as the default barcode adapter.
 *
 * On invalid barcode format (rejected by the Barcode VO inside the use case)
 * returns `null` so callers can treat scan misreads as "unknown".
 */
export class IngredientBarcodeResolver implements IBarcodeResolver {
  constructor(private readonly resolveByBarcode: ResolveByBarcodeUseCase) {}

  async resolve(barcode: string, householdId: string): Promise<BarcodeResolution | null> {
    let result
    try {
      result = await this.resolveByBarcode.execute({ barcode, householdId })
    } catch {
      // Malformed barcode — treat as unknown.
      return null
    }
    if (!result) return null
    return {
      name: result.ingredient.name,
      defaultUnit: result.ingredient.canonicalUnit,
      ingredientId: result.ingredient.id,
      productId: result.product.id,
      storage: result.ingredient.storage,
      category: result.ingredient.category,
    }
  }
}
