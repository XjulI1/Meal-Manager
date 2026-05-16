import { mysqlTable, char, varchar, timestamp, datetime, index, uniqueIndex } from 'drizzle-orm/mysql-core'
import { users } from './users'
import { households } from './households'

export const personalAccessTokens = mysqlTable(
  'personal_access_tokens',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    householdId: char('household_id', { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    prefix: char('prefix', { length: 8 }).notNull(),
    lastUsedAt: datetime('last_used_at'),
    revokedAt: datetime('revoked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    tokenHashUq: uniqueIndex('personal_access_tokens_token_hash_uq').on(t.tokenHash),
    userIdx: index('personal_access_tokens_user_idx').on(t.userId),
    userActiveIdx: index('personal_access_tokens_user_active_idx').on(t.userId, t.revokedAt),
  }),
)

export type PersonalAccessTokenRow = typeof personalAccessTokens.$inferSelect
export type NewPersonalAccessTokenRow = typeof personalAccessTokens.$inferInsert
