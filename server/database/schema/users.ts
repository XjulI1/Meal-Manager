import { mysqlTable, char, varchar, timestamp, index, boolean } from 'drizzle-orm/mysql-core'

export const users = mysqlTable(
  'users',
  {
    id: char('id', { length: 36 }).primaryKey(),
    email: varchar('email', { length: 254 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    // AI feature access gate. Off by default so AI usage never accrues cost
    // until explicitly enabled for an account (admin-toggled via DB in v1).
    aiEnabled: boolean('ai_enabled').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    emailIdx: index('users_email_idx').on(t.email),
  }),
)

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
