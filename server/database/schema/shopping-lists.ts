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
import { ingredients } from './ingredients'
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
    ingredientId: char('ingredient_id', { length: 36 })
      .notNull()
      .references(() => ingredients.id, { onDelete: 'restrict' }),
    /** Denormalized snapshot of the ingredient name at generation time. */
    ingredientName: varchar('ingredient_name', { length: 120 }).notNull(),
    /** Denormalized snapshot of the ingredient category at generation time. */
    category: mysqlEnum('category', [
      'produce',
      'bakery',
      'meat-fish',
      'dairy',
      'frozen',
      'grocery',
      'beverages',
      'household',
      'other',
    ]).notNull().default('other'),
    quantityValue: int('quantity_value', { unsigned: true }).notNull(),
    quantityUnit: mysqlEnum('quantity_unit', ['g', 'ml', 'unit']).notNull(),
    isChecked: boolean('is_checked').notNull().default(false),
  },
  (t) => ({
    snapshotIdx: index('shopping_list_items_snapshot_idx').on(t.snapshotId),
    ingredientIdx: index('shopping_list_items_ingredient_idx').on(t.ingredientId),
  }),
)

export type ShoppingListSnapshotRow = typeof shoppingListSnapshots.$inferSelect
export type NewShoppingListSnapshotRow = typeof shoppingListSnapshots.$inferInsert
export type ShoppingListItemRow = typeof shoppingListItems.$inferSelect
export type NewShoppingListItemRow = typeof shoppingListItems.$inferInsert
