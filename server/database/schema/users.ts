import { mysqlTable, char, varchar, timestamp, index } from 'drizzle-orm/mysql-core'

export const users = mysqlTable(
  'users',
  {
    id: char('id', { length: 36 }).primaryKey(),
    email: varchar('email', { length: 254 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    emailIdx: index('users_email_idx').on(t.email),
  }),
)

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
