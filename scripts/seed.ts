import { existsSync, readFileSync } from 'node:fs'

import { sql } from 'drizzle-orm'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { directories } from '../db/schema'
import {
  SOURCE_CRAWL,
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
const CRAWL_JSON = process.env.CRAWL_SEED ?? ''

const CRAWL_SEED_AVAILABLE = Boolean(CRAWL_JSON) && existsSync(CRAWL_JSON)

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

  // Source 1: a crawl of the domains a paid service a paid service submitted products to.
  // Skipped when the file is not around, which is the normal case for a clone.
  let crawlStats: UpsertStats | null = null
  if (CRAWL_SEED_AVAILABLE) {
    const crawlRows = parseSeedFile(JSON.parse(readFileSync(CRAWL_JSON, 'utf8')))
    crawlStats = upsertDirectories(db, SOURCE_CRAWL, crawlRows, { crawled: true })
    report(SOURCE_CRAWL, crawlStats)
    logEvent(db, { action: 'seed.source', detail: { ...crawlStats, insertedDomains: undefined } })
  } else {
    console.log(`  ${SOURCE_CRAWL.padEnd(14)} skipped, set CRAWL_SEED to a crawl file`)
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
      crawlStats: crawlStats ? { inserted: crawlStats.inserted, updated: crawlStats.updated } : 'skipped',
    },
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
