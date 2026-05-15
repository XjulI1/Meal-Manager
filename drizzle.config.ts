import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be defined for drizzle-kit.')
}

export default defineConfig({
  dialect: 'mysql',
  schema: './server/database/schema',
  out: './server/database/migrations',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
})
