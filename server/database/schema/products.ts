import {
  mysqlTable,
  mysqlEnum,
  char,
  varchar,
  int,
  timestamp,
  primaryKey,
  unique,
  index,
} from 'drizzle-orm/mysql-core'
import { households } from './households'
import { ingredients } from './ingredients'

export const products = mysqlTable(
  'products',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    ingredientId: char('ingredient_id', { length: 36 })
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    brand: varchar('brand', { length: 100 }),
    packSize: int('pack_size', { unsigned: true }).notNull(),
    packUnit: mysqlEnum('pack_unit', ['g', 'ml', 'unit']).notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    householdIdx: index('products_household_idx').on(t.householdId),
    ingredientIdx: index('products_ingredient_idx').on(t.ingredientId),
  }),
)

export const productBarcodes = mysqlTable(
  'product_barcodes',
  {
    productId: char('product_id', { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Denormalized from product.household_id so we can enforce barcode uniqueness per household. */
    householdId: char('household_id', { length: 36 }).notNull(),
    /** Normalized GTIN (EAN-13 or EAN-8). UPC-A is normalized to EAN-13 by prefixing 0. */
    barcode: varchar('barcode', { length: 14 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.barcode] }),
    householdBarcodeUq: unique('product_barcodes_household_barcode_uq').on(t.householdId, t.barcode),
    barcodeIdx: index('product_barcodes_barcode_idx').on(t.barcode),
  }),
)

export type ProductRow = typeof products.$inferSelect
export type NewProductRow = typeof products.$inferInsert
export type ProductBarcodeRow = typeof productBarcodes.$inferSelect
export type NewProductBarcodeRow = typeof productBarcodes.$inferInsert
