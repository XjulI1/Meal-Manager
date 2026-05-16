import { and, eq, ne, sql } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { productBarcodes, products } from '../../../../database/schema/products'
import type { Product } from '../../domain/entities/product.entity'
import type { IProductRepository } from '../../domain/ports/product-repository.port'
import { ProductMapper } from '../mappers/product.mapper'

export class DrizzleProductRepository implements IProductRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string, householdId: string): Promise<Product | null> {
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.householdId, householdId)))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    const barcodes = await this.loadBarcodes([row.id])
    return ProductMapper.toDomain(row, barcodes.get(row.id) ?? [])
  }

  async findByIngredient(ingredientId: string, householdId: string): Promise<Product[]> {
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.ingredientId, ingredientId), eq(products.householdId, householdId)))
    if (rows.length === 0) return []
    const barcodesById = await this.loadBarcodes(rows.map((r) => r.id))
    return rows.map((r) => ProductMapper.toDomain(r, barcodesById.get(r.id) ?? []))
  }

  async findByBarcodeInHousehold(barcode: string, householdId: string): Promise<Product | null> {
    const matched = await this.db
      .select({ productId: productBarcodes.productId })
      .from(productBarcodes)
      .where(and(eq(productBarcodes.householdId, householdId), eq(productBarcodes.barcode, barcode)))
      .limit(1)
    const productId = matched[0]?.productId
    if (!productId) return null
    return this.findById(productId, householdId)
  }

  async findDuplicateBarcodesInHousehold(
    candidates: readonly string[],
    householdId: string,
    excludeProductId?: string,
  ): Promise<string[]> {
    if (candidates.length === 0) return []
    const conditions = [
      eq(productBarcodes.householdId, householdId),
      sql`${productBarcodes.barcode} IN (${sql.join(candidates.map((b) => sql`${b}`), sql`, `)})`,
    ]
    if (excludeProductId) {
      conditions.push(ne(productBarcodes.productId, excludeProductId))
    }
    const rows = await this.db
      .select({ barcode: productBarcodes.barcode })
      .from(productBarcodes)
      .where(and(...conditions))
    return rows.map((r) => r.barcode)
  }

  async save(product: Product): Promise<void> {
    const row = ProductMapper.toPersistence(product)
    const barcodeRows = product.barcodes.map((b) => ({
      productId: product.id,
      householdId: product.householdId,
      barcode: b.value,
    }))

    await this.db.transaction(async (tx) => {
      await tx
        .insert(products)
        .values(row)
        .onDuplicateKeyUpdate({
          set: {
            brand: row.brand ?? null,
            packSize: row.packSize,
            packUnit: row.packUnit,
            imageUrl: row.imageUrl ?? null,
            updatedAt: row.updatedAt,
          },
        })

      // Atomically replace the barcode list
      await tx.delete(productBarcodes).where(eq(productBarcodes.productId, product.id))
      if (barcodeRows.length > 0) {
        await tx.insert(productBarcodes).values(barcodeRows)
      }
    })
  }

  async delete(id: string, householdId: string): Promise<void> {
    await this.db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.householdId, householdId)))
  }

  private async loadBarcodes(productIds: string[]): Promise<Map<string, string[]>> {
    if (productIds.length === 0) return new Map()
    const rows = await this.db
      .select()
      .from(productBarcodes)
      .where(
        sql`${productBarcodes.productId} IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)})`,
      )
    const map = new Map<string, string[]>()
    for (const r of rows) {
      const list = map.get(r.productId) ?? []
      list.push(r.barcode)
      map.set(r.productId, list)
    }
    return map
  }
}
