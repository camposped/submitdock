import path from 'node:path'

import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import { DB_PATH, openDb } from '../db/connect'

const db = openDb()
migrate(db, { migrationsFolder: path.join(process.cwd(), 'db', 'migrations') })
console.log(`migrations applied to ${DB_PATH}`)
