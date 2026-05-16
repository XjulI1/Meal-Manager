import {
  mysqlTable,
  mysqlEnum,
  char,
  int,
  timestamp,
  index,
} from 'drizzle-orm/mysql-core'
import { households } from './households'
import { ingredients } from './ingredients'

export const inventoryItems = mysqlTable(
  'inventory_items',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    ingredientId: char('ingredient_id', { length: 36 })
      .notNull()
      .references(() => ingredients.id, { onDelete: 'restrict' }),
    /** Quantity in canonical unit (g, ml, unit). */
    quantityValue: int('quantity_value', { unsigned: true }).notNull(),
    quantityUnit: mysqlEnum('quantity_unit', ['g', 'ml', 'unit']).notNull(),
    location: mysqlEnum('location', ['pantry', 'fridge']).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    householdIdx: index('inventory_items_household_idx').on(t.householdId),
    locationIdx: index('inventory_items_location_idx').on(t.householdId, t.location),
    ingredientIdx: index('inventory_items_ingredient_idx').on(t.ingredientId),
  }),
)

export type InventoryItemRow = typeof inventoryItems.$inferSelect
export type NewInventoryItemRow = typeof inventoryItems.$inferInsert
