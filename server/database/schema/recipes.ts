import {
  mysqlTable,
  mysqlEnum,
  char,
  varchar,
  int,
  text,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/mysql-core'
import { households } from './households'
import { ingredients } from './ingredients'

export const recipes = mysqlTable(
  'recipes',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    instructions: text('instructions').notNull(),
    servings: int('servings', { unsigned: true }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    householdIdx: index('recipes_household_idx').on(t.householdId),
  }),
)

export const recipeIngredients = mysqlTable(
  'recipe_ingredients',
  {
    recipeId: char('recipe_id', { length: 36 })
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: int('position', { unsigned: true }).notNull(),
    ingredientId: char('ingredient_id', { length: 36 })
      .notNull()
      .references(() => ingredients.id, { onDelete: 'restrict' }),
    quantityValue: int('quantity_value', { unsigned: true }).notNull(),
    quantityUnit: mysqlEnum('quantity_unit', ['g', 'ml', 'unit']).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.recipeId, t.position] }),
    ingredientIdx: index('recipe_ingredients_ingredient_idx').on(t.ingredientId),
  }),
)

export type RecipeRow = typeof recipes.$inferSelect
export type NewRecipeRow = typeof recipes.$inferInsert
export type RecipeIngredientRow = typeof recipeIngredients.$inferSelect
export type NewRecipeIngredientRow = typeof recipeIngredients.$inferInsert
