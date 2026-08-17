import { mkdirSync } from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import * as schema from './schema'

export const DB_PATH =
  process.env.SUBMITDOCK_DB ?? path.join(process.cwd(), 'data', 'submitdock.db')

/**
 * WAL is what lets a script write while the app is open reading, which phase 2
 * (the Chrome driver filling forms) depends on. busy_timeout turns the two
 * writers racing from an instant SQLITE_BUSY into a short wait.
 */
export function openDb() {
  mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('busy_timeout = 5000')
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

export type Db = ReturnType<typeof openDb>

const globalForDb = globalThis as unknown as { submitdock?: Db }

/** One connection per process, surviving Next's dev hot reloads. */
export function getDb(): Db {
  if (!globalForDb.submitdock) globalForDb.submitdock = openDb()
  return globalForDb.submitdock
}
