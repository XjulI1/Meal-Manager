import type { CanonicalUnit } from '../../../../../shared/units/conversions'
import type { ProductRow, NewProductRow } from '../../../../database/schema/products'
import { Product } from '../../domain/entities/product.entity'
import { Barcode } from '../../domain/value-objects/barcode.vo'

export const ProductMapper = {
  toDomain(row: ProductRow, barcodes: string[]): Product {
    return Product.rehydrate({
      id: row.id,
      householdId: row.householdId,
      ingredientId: row.ingredientId,
      brand: row.brand ?? null,
      packSize: row.packSize,
      packUnit: row.packUnit as CanonicalUnit,
      imageUrl: row.imageUrl ?? null,
      barcodes: barcodes.map((b) => Barcode.fromString(b)),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(product: Product): NewProductRow {
    return {
      id: product.id,
      householdId: product.householdId,
      ingredientId: product.ingredientId,
      brand: product.brand ?? null,
      packSize: product.packSize,
      packUnit: product.packUnit,
      imageUrl: product.imageUrl ?? null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }
  },
}
