import { mysqlTable, char, varchar, timestamp, primaryKey, index } from 'drizzle-orm/mysql-core'
import { users } from './users'

export const households = mysqlTable(
  'households',
  {
    id: char('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    inviteCode: varchar('invite_code', { length: 32 }).notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    inviteCodeIdx: index('households_invite_code_idx').on(t.inviteCode),
  }),
)

export const householdMembers = mysqlTable(
  'household_members',
  {
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.householdId, t.userId] }),
    userIdx: index('household_members_user_idx').on(t.userId),
  }),
)

export type HouseholdRow = typeof households.$inferSelect
export type NewHouseholdRow = typeof households.$inferInsert
export type HouseholdMemberRow = typeof householdMembers.$inferSelect
export type NewHouseholdMemberRow = typeof householdMembers.$inferInsert
