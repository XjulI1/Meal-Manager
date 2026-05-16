import type { Ingredient } from '../../domain/entities/ingredient.entity'
import type { Product } from '../../domain/entities/product.entity'
import type { IIngredientRepository } from '../../domain/ports/ingredient-repository.port'
import type { IProductRepository } from '../../domain/ports/product-repository.port'
import { Barcode } from '../../domain/value-objects/barcode.vo'
import {
  toIngredientView,
  toProductView,
  type IngredientView,
  type ProductView,
} from './views'

export interface ResolveByBarcodeInput {
  householdId: string
  barcode: string
}

export interface ResolveByBarcodeResult {
  ingredient: IngredientView
  product: ProductView
}

export class ResolveByBarcodeUseCase {
  constructor(
    private readonly ingredients: IIngredientRepository,
    private readonly products: IProductRepository,
  ) {}

  async execute(input: ResolveByBarcodeInput): Promise<ResolveByBarcodeResult | null> {
    // Normalize input via the VO (rejects invalid format).
    const normalized = Barcode.fromString(input.barcode).value

    const product: Product | null = await this.products.findByBarcodeInHousehold(normalized, input.householdId)
    if (!product) return null

    const ingredient: Ingredient | null = await this.ingredients.findById(product.ingredientId, input.householdId)
    if (!ingredient) return null // defensive: should not happen given FK ON DELETE CASCADE

    return {
      ingredient: toIngredientView(ingredient),
      product: toProductView(product),
    }
  }
}
