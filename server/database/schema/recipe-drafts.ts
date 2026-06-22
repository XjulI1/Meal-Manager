import {
  mysqlTable,
  mysqlEnum,
  char,
  varchar,
  int,
  text,
  decimal,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/mysql-core'
import { households } from './households'

/**
 * Persisted recipe drafts (work-in-progress recipes) scoped to a household.
 * Unlike `recipes`, content fields are nullable and ingredients are stored as
 * FREE TEXT (name + loose quantity/unit) — they are NOT yet resolved to the
 * catalog nor normalized to canonical units. Normalization happens only at
 * promotion, through the existing resolve + create-recipe flow.
 */
export const RECIPE_DRAFT_SOURCES = ['manual', 'ai-chat', 'ai-url', 'ai-photo', 'mcp'] as const

export const recipeDrafts = mysqlTable(
  'recipe_drafts',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    source: mysqlEnum('source', RECIPE_DRAFT_SOURCES).notNull(),
    title: varchar('title', { length: 200 }),
    instructions: text('instructions'),
    servings: int('servings', { unsigned: true }),
    sourceUrl: varchar('source_url', { length: 2000 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    householdIdx: index('recipe_drafts_household_idx').on(t.householdId),
  }),
)

export const recipeDraftIngredients = mysqlTable(
  'recipe_draft_ingredients',
  {
    draftId: char('draft_id', { length: 36 })
      .notNull()
      .references(() => recipeDrafts.id, { onDelete: 'cascade' }),
    position: int('position', { unsigned: true }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    /** Free-text quantity (pre-resolution): value + unit kept as the user/AI provided them. */
    quantityValue: decimal('quantity_value', { precision: 10, scale: 2 }),
    quantityUnit: varchar('quantity_unit', { length: 40 }),
    raw: varchar('raw', { length: 300 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.draftId, t.position] }),
  }),
)

export type RecipeDraftRow = typeof recipeDrafts.$inferSelect
export type NewRecipeDraftRow = typeof recipeDrafts.$inferInsert
export type RecipeDraftIngredientRow = typeof recipeDraftIngredients.$inferSelect
export type NewRecipeDraftIngredientRow = typeof recipeDraftIngredients.$inferInsert
