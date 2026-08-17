import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { exportCatalog, serializeCatalog } from '../lib/catalog-io'

const OUT = path.join(process.cwd(), 'data', 'catalog.export.json')

const db = openDb()
const records = exportCatalog(db)

mkdirSync(path.dirname(OUT), { recursive: true })
writeFileSync(OUT, serializeCatalog(records))

logEvent(db, { action: 'catalog.export', detail: { count: records.length, file: 'data/catalog.export.json' } })

console.log(`exported ${records.length} domains to data/catalog.export.json`)
