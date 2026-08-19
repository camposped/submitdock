import { existsSync, readFileSync } from 'node:fs'

import { sql } from 'drizzle-orm'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { directories } from '../db/schema'
import {
  SOURCE_SUPAPIN,
  parseSeedFile,
  upsertDirectories,
  type UpsertStats,
} from '../lib/seed'

/**
 * The first source is a crawl I ran once, so there is no sensible default path
 * for anyone else. Cloning this repo you do not need it: `npm run import` loads
 * the same 353 domains from the committed snapshot. This script exists for
 * rebuilding the catalog from its sources.
 */
const SUPAPIN_JSON = process.env.SUPAPIN_SEED ?? ''

const SUPAPIN_SEED_AVAILABLE = Boolean(SUPAPIN_JSON) && existsSync(SUPAPIN_JSON)

function report(label: string, stats: UpsertStats) {
  console.log(
    `  ${label.padEnd(14)} seen ${String(stats.seen).padStart(4)}` +
      `  inserted ${String(stats.inserted).padStart(4)}` +
      `  updated ${String(stats.updated).padStart(4)}` +
      `  unchanged ${String(stats.unchanged).padStart(4)}`,
  )
}

async function main() {
  const db = openDb()

  console.log('seeding catalog')

  // Source 1: a crawl of the domains a paid service submitted Supapin to.
  // Skipped when the file is not around, which is the normal case for a clone.
  let supapin: UpsertStats | null = null
  if (SUPAPIN_SEED_AVAILABLE) {
    const supapinRows = parseSeedFile(JSON.parse(readFileSync(SUPAPIN_JSON, 'utf8')))
    supapin = upsertDirectories(db, SOURCE_SUPAPIN, supapinRows, { crawled: true })
    report(SOURCE_SUPAPIN, supapin)
    logEvent(db, { action: 'seed.source', detail: { ...supapin, insertedDomains: undefined } })
  } else {
    console.log(`  ${SOURCE_SUPAPIN.padEnd(14)} skipped, set SUPAPIN_SEED to a crawl file`)
    console.log('  (npm run import loads the same domains from data/catalog.export.json)')
  }

  const [{ total }] = db
    .select({ total: sql<number>`count(*)` })
    .from(directories)
    .all()

  console.log('')
  console.log(`  catalog total: ${total} domains`)
  console.log('')
  console.log('  authority is not part of this. Semrush Authority Score arrives')
  console.log('  through `npm run authority`, on its own clock: the catalog')
  console.log('  changes when a directory appears or dies, the scores monthly.')

  logEvent(db, {
    action: 'seed.done',
    detail: {
      total,
      supapin: supapin ? { inserted: supapin.inserted, updated: supapin.updated } : 'skipped',
    },
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
