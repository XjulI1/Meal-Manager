import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

let pool: mysql.Pool | null = null
let dbInstance: MySql2Database<typeof schema> | null = null

function getPool(): mysql.Pool {
  if (pool) return pool
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set.')
  }
  pool = mysql.createPool({
    uri: url,
    connectionLimit: 10,
    waitForConnections: true,
    timezone: 'Z',
  })
  return pool
}

export function useDb(): MySql2Database<typeof schema> {
  if (dbInstance) return dbInstance
  dbInstance = drizzle(getPool(), { schema, mode: 'default' })
  return dbInstance
}

export type Database = ReturnType<typeof useDb>
export { schema }
