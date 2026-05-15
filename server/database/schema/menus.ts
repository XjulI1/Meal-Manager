import {
  mysqlTable,
  mysqlEnum,
  char,
  date,
  int,
  timestamp,
  primaryKey,
  unique,
  index,
} from 'drizzle-orm/mysql-core'
import { households } from './households'
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

export const menuSlots = mysqlTable(
  'menu_slots',
  {
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
    recipeId: char('recipe_id', { length: 36 })
      .references(() => recipes.id, { onDelete: 'set null' }),
    servings: int('servings', { unsigned: true }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.menuId, t.dayOfWeek, t.mealType] }),
  }),
)

export type MenuRow = typeof menus.$inferSelect
export type NewMenuRow = typeof menus.$inferInsert
export type MenuSlotRow = typeof menuSlots.$inferSelect
export type NewMenuSlotRow = typeof menuSlots.$inferInsert
