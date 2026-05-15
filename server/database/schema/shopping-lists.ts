import {
  mysqlTable,
  mysqlEnum,
  char,
  varchar,
  int,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/mysql-core'
import { households } from './households'
import { menus } from './menus'

export const shoppingListSnapshots = mysqlTable(
  'shopping_list_snapshots',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    menuId: char('menu_id', { length: 36 })
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    generatedAt: timestamp('generated_at').notNull().defaultNow(),
  },
  (t) => ({
    householdIdx: index('shopping_lists_household_idx').on(t.householdId),
    menuIdx: index('shopping_lists_menu_idx').on(t.menuId),
  }),
)

export const shoppingListItems = mysqlTable(
  'shopping_list_items',
  {
    id: char('id', { length: 36 }).primaryKey(),
    snapshotId: char('snapshot_id', { length: 36 })
      .notNull()
      .references(() => shoppingListSnapshots.id, { onDelete: 'cascade' }),
    ingredientName: varchar('ingredient_name', { length: 120 }).notNull(),
    quantityValue: int('quantity_value', { unsigned: true }).notNull(),
    quantityUnit: mysqlEnum('quantity_unit', ['g', 'ml', 'unit']).notNull(),
    isChecked: boolean('is_checked').notNull().default(false),
  },
  (t) => ({
    snapshotIdx: index('shopping_list_items_snapshot_idx').on(t.snapshotId),
  }),
)

export type ShoppingListSnapshotRow = typeof shoppingListSnapshots.$inferSelect
export type NewShoppingListSnapshotRow = typeof shoppingListSnapshots.$inferInsert
export type ShoppingListItemRow = typeof shoppingListItems.$inferSelect
export type NewShoppingListItemRow = typeof shoppingListItems.$inferInsert
