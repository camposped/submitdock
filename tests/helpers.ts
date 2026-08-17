import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import * as schema from '@/db/schema'

/**
 * A throwaway database on disk rather than in memory, so the tests exercise the
 * same migrations the real file gets.
 */
export function makeTestDb() {
  const dir = mkdtempSync(path.join(tmpdir(), 'submitdock-test-'))
  const sqlite = new Database(path.join(dir, 'test.db'))
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'db', 'migrations') })

  return {
    db,
    cleanup() {
      sqlite.close()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
