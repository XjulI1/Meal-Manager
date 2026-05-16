import { randomUUID } from 'node:crypto'
import type { CanonicalUnit } from '../../../../../shared/units/conversions'
import { Product } from '../../domain/entities/product.entity'
import { DuplicateBarcodeError } from '../../domain/errors/duplicate-barcode.error'
import { IngredientNotFoundError } from '../../domain/errors/ingredient-not-found.error'
import type { IIngredientRepository } from '../../domain/ports/ingredient-repository.port'
import type { IProductRepository } from '../../domain/ports/product-repository.port'
import { Barcode } from '../../domain/value-objects/barcode.vo'
import { toProductView, type ProductView } from './views'

export interface AddProductInput {
  householdId: string
  ingredientId: string
  brand?: string | null
  packSize: number
  packUnit: CanonicalUnit
  imageUrl?: string | null
  barcodes: readonly string[]
}

export class AddProductUseCase {
  constructor(
    private readonly ingredients: IIngredientRepository,
    private readonly products: IProductRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AddProductInput): Promise<ProductView> {
    const ingredient = await this.ingredients.findById(input.ingredientId, input.householdId)
    if (!ingredient || ingredient.archived) {
      throw new IngredientNotFoundError(input.ingredientId)
    }

    // Normalize barcodes via the VO and check uniqueness in the household.
    const normalized = input.barcodes.map((b) => Barcode.fromString(b).value)
    const duplicates = await this.products.findDuplicateBarcodesInHousehold(normalized, input.householdId)
    if (duplicates.length > 0) {
      throw new DuplicateBarcodeError(duplicates[0]!)
    }

    const product = Product.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      ingredientId: ingredient.id,
      ingredientCanonicalUnit: ingredient.canonicalUnit,
      brand: input.brand ?? null,
      packSize: input.packSize,
      packUnit: input.packUnit,
      imageUrl: input.imageUrl ?? null,
      barcodes: normalized,
      now: this.clock(),
    })

    await this.products.save(product)
    return toProductView(product)
  }
}
