import { DuplicateBarcodeError } from '../../domain/errors/duplicate-barcode.error'
import { ProductNotFoundError } from '../../domain/errors/product-not-found.error'
import type { IProductRepository } from '../../domain/ports/product-repository.port'
import { Barcode } from '../../domain/value-objects/barcode.vo'
import { toProductView, type ProductView } from './views'

export interface UpdateProductInput {
  householdId: string
  id: string
  brand?: string | null
  packSize?: number
  imageUrl?: string | null
  barcodes?: readonly string[]
}

export class UpdateProductUseCase {
  constructor(
    private readonly products: IProductRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateProductInput): Promise<ProductView> {
    const existing = await this.products.findById(input.id, input.householdId)
    if (!existing) {
      throw new ProductNotFoundError(input.id)
    }

    let normalizedBarcodes: string[] | undefined
    if (input.barcodes !== undefined) {
      normalizedBarcodes = input.barcodes.map((b) => Barcode.fromString(b).value)
      const duplicates = await this.products.findDuplicateBarcodesInHousehold(
        normalizedBarcodes,
        input.householdId,
        existing.id,
      )
      if (duplicates.length > 0) {
        throw new DuplicateBarcodeError(duplicates[0]!)
      }
    }

    const updated = existing.update(
      {
        brand: input.brand,
        packSize: input.packSize,
        imageUrl: input.imageUrl,
        barcodes: normalizedBarcodes,
      },
      this.clock(),
    )

    await this.products.save(updated)
    return toProductView(updated)
  }
}
