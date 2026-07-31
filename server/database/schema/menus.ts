import {
  mysqlTable,
  mysqlEnum,
  char,
  date,
  int,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/mysql-core'
import { households } from './households'
import { ingredients } from './ingredients'
import { recipes } from './recipes'

export const menus = mysqlTable(
  'menus',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    weekStart: date('week_start').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    uniqWeek: unique('menus_household_week_uniq').on(t.householdId, t.weekStart),
    householdIdx: index('menus_household_idx').on(t.householdId),
  }),
)

export const menuSlotItems = mysqlTable(
  'menu_slot_items',
  {
    id: char('id', { length: 36 }).primaryKey(),
    menuId: char('menu_id', { length: 36 })
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    dayOfWeek: mysqlEnum('day_of_week', [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]).notNull(),
    mealType: mysqlEnum('meal_type', ['breakfast', 'lunch', 'dinner']).notNull(),
    kind: mysqlEnum('kind', ['recipe', 'ingredient']).notNull(),
    recipeId: char('recipe_id', { length: 36 })
      .references(() => recipes.id, { onDelete: 'cascade' }),
    servings: int('servings', { unsigned: true }),
    ingredientId: char('ingredient_id', { length: 36 })
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    quantityValue: int('quantity_value', { unsigned: true }),
    quantityUnit: mysqlEnum('quantity_unit', ['g', 'ml', 'unit']),
  },
  (t) => ({
    slotIdx: index('menu_slot_items_slot_idx').on(t.menuId, t.dayOfWeek, t.mealType),
    // Guard against duplicate free-ingredient rows within the same slot. Recipe
    // rows carry ingredientId = NULL and MariaDB allows multiple NULLs, so this
    // constraint never impacts recipe items.
    uniqIngredient: unique('menu_slot_items_ingredient_uniq').on(t.menuId, t.dayOfWeek, t.mealType, t.ingredientId),
  }),
)

export type MenuRow = typeof menus.$inferSelect
export type NewMenuRow = typeof menus.$inferInsert
export type MenuSlotItemRow = typeof menuSlotItems.$inferSelect
export type NewMenuSlotItemRow = typeof menuSlotItems.$inferInsert
