import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { importCatalog } from '../lib/catalog-io'

const IN = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), 'data', 'catalog.export.json')

if (!existsSync(IN)) {
  console.error(`nothing to import: ${IN} does not exist`)
  process.exit(1)
}

const db = openDb()
const stats = importCatalog(db, JSON.parse(readFileSync(IN, 'utf8')))

logEvent(db, { action: 'catalog.import', detail: { file: path.relative(process.cwd(), IN), ...stats } })

console.log(
  `imported ${path.relative(process.cwd(), IN)}: ` +
    `${stats.inserted} new, ${stats.updated} updated, ${stats.unchanged} unchanged` +
    (stats.skipped ? `, ${stats.skipped} skipped` : ''),
)
