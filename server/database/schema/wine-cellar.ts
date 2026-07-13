import {
  mysqlTable,
  mysqlEnum,
  char,
  varchar,
  int,
  smallint,
  tinyint,
  date,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/mysql-core'
import { households } from './households'

/** A wine cellar declared by a household. */
export const wineCellars = mysqlTable(
  'wine_cellars',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    householdIdx: index('wine_cellars_household_idx').on(t.householdId),
  }),
)

/** A shelf (clayette) inside a cellar. */
export const wineShelves = mysqlTable(
  'wine_shelves',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    cellarId: char('cellar_id', { length: 36 })
      .notNull()
      .references(() => wineCellars.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 120 }),
    position: int('position', { unsigned: true }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    cellarIdx: index('wine_shelves_cellar_idx').on(t.cellarId),
    householdIdx: index('wine_shelves_household_idx').on(t.householdId),
  }),
)

/** A row/level (étage) inside a shelf, with front/back capacities. */
export const wineRows = mysqlTable(
  'wine_rows',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    shelfId: char('shelf_id', { length: 36 })
      .notNull()
      .references(() => wineShelves.id, { onDelete: 'cascade' }),
    position: int('position', { unsigned: true }).notNull(),
    /** Number of slots in the back row (always present, ≥ 1). */
    capacityBack: int('capacity_back', { unsigned: true }).notNull(),
    /** Number of slots in the optional front row (0 = no front row). */
    capacityFront: int('capacity_front', { unsigned: true }).notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    shelfIdx: index('wine_rows_shelf_idx').on(t.shelfId),
    householdIdx: index('wine_rows_household_idx').on(t.householdId),
  }),
)

/** A wine reference (cuvée) owned by a household. */
export const wines = mysqlTable(
  'wines',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    domain: varchar('domain', { length: 200 }),
    country: varchar('country', { length: 80 }),
    /** Closed-list region slug (see WineRegion VO) or 'autre'. */
    region: varchar('region', { length: 40 }),
    appellation: varchar('appellation', { length: 200 }),
    vintage: smallint('vintage', { unsigned: true }),
    color: mysqlEnum('color', ['rouge', 'blanc', 'rose', 'effervescent']).notNull(),
    /** Drink-from year (apogée). */
    gardeMin: smallint('garde_min', { unsigned: true }),
    /** Drink-until year (apogée). */
    gardeMax: smallint('garde_max', { unsigned: true }),
    comment: text('comment'),
    photoUrl: varchar('photo_url', { length: 500 }),
    /** Optional 0–5 personal rating. */
    rating: tinyint('rating', { unsigned: true }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    householdIdx: index('wines_household_idx').on(t.householdId),
  }),
)

/**
 * A physical bottle instance of a wine.
 *
 * Position columns (`row_id`, `depth`, `slot_index`) are either all NULL
 * (unplaced pool / consumed) or all set. The UNIQUE index enforces
 * "one bottle per slot": MySQL/MariaDB allow multiple all-NULL rows in a
 * unique index, so the pool and consumed bottles never collide.
 */
export const wineBottles = mysqlTable(
  'wine_bottles',
  {
    id: char('id', { length: 36 }).primaryKey(),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    wineId: char('wine_id', { length: 36 })
      .notNull()
      .references(() => wines.id, { onDelete: 'cascade' }),
    /** Bottle capacity in canonical volume unit (ml). */
    sizeMl: int('size_ml', { unsigned: true }).notNull(),
    /** Purchase price in cents (euros × 100); NULL when unknown. */
    buyingPriceCents: int('buying_price_cents', { unsigned: true }),
    addedDate: date('added_date', { mode: 'string' }),
    status: mysqlEnum('status', ['in_stock', 'consumed']).notNull().default('in_stock'),
    rowId: char('row_id', { length: 36 }),
    depth: mysqlEnum('depth', ['front', 'back']),
    slotIndex: int('slot_index', { unsigned: true }),
    exitReason: mysqlEnum('exit_reason', ['consumed', 'gifted', 'broken']),
    exitDate: date('exit_date', { mode: 'string' }),
    tastingNote: text('tasting_note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    householdIdx: index('wine_bottles_household_idx').on(t.householdId),
    wineIdx: index('wine_bottles_wine_idx').on(t.wineId),
    rowIdx: index('wine_bottles_row_idx').on(t.rowId),
    statusIdx: index('wine_bottles_status_idx').on(t.householdId, t.status),
    slotUq: unique('wine_bottles_slot_uq').on(t.rowId, t.depth, t.slotIndex),
  }),
)

export type WineCellarRow = typeof wineCellars.$inferSelect
export type NewWineCellarRow = typeof wineCellars.$inferInsert
export type WineShelfRow = typeof wineShelves.$inferSelect
export type NewWineShelfRow = typeof wineShelves.$inferInsert
export type WineRowRow = typeof wineRows.$inferSelect
export type NewWineRowRow = typeof wineRows.$inferInsert
export type WineRow = typeof wines.$inferSelect
export type NewWineRow = typeof wines.$inferInsert
export type WineBottleRow = typeof wineBottles.$inferSelect
export type NewWineBottleRow = typeof wineBottles.$inferInsert
