import {
  mysqlTable,
  mysqlEnum,
  char,
  varchar,
  int,
  json,
  timestamp,
  datetime,
  primaryKey,
  index,
} from 'drizzle-orm/mysql-core'
import { households } from './households'

export const ingredients = mysqlTable(
  'ingredients',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    storage: mysqlEnum('storage', ['pantry', 'fridge']).notNull(),
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
    ]).notNull(),
    canonicalUnit: mysqlEnum('canonical_unit', ['g', 'ml', 'unit']).notNull(),
    shelfLifeDays: int('shelf_life_days', { unsigned: true }),
    imageUrl: varchar('image_url', { length: 500 }),
    defaultPackSize: int('default_pack_size', { unsigned: true }),
    /** JSON array of allergen codes (Allergen VO values). */
    allergens: json('allergens'),
    /** Soft-delete timestamp. NULL when the ingredient is active. */
    deletedAt: datetime('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    householdIdx: index('ingredients_household_idx').on(t.householdId),
    activeNameIdx: index('ingredients_household_name_active_idx').on(t.householdId, t.name, t.deletedAt),
    categoryIdx: index('ingredients_household_category_idx').on(t.householdId, t.category),
  }),
)

export const ingredientAliases = mysqlTable(
  'ingredient_aliases',
  {
    ingredientId: char('ingredient_id', { length: 36 })
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    alias: varchar('alias', { length: 100 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.ingredientId, t.alias] }),
    aliasIdx: index('ingredient_aliases_alias_idx').on(t.alias),
  }),
)

export type IngredientRow = typeof ingredients.$inferSelect
export type NewIngredientRow = typeof ingredients.$inferInsert
export type IngredientAliasRow = typeof ingredientAliases.$inferSelect
export type NewIngredientAliasRow = typeof ingredientAliases.$inferInsert
