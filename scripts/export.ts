import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { exportCatalog, serializeCatalog } from '../lib/catalog-io'

/**
 * Writes the catalog back out.
 *
 *   npm run export                    # the snapshot this repo tracks
 *   npm run export -- /tmp/mine.json  # anywhere else
 *
 * The destination used to be hardcoded, which meant running it against a
 * scratch database silently overwrote the committed snapshot with whatever
 * that database happened to hold.
 */
const OUT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), 'data', 'catalog.export.json')

const LABEL = path.relative(process.cwd(), OUT)

const db = openDb()
const records = exportCatalog(db)

mkdirSync(path.dirname(OUT), { recursive: true })
writeFileSync(OUT, serializeCatalog(records))

logEvent(db, { action: 'catalog.export', detail: { count: records.length, file: LABEL } })

console.log(`exported ${records.length} domains to ${LABEL}`)
