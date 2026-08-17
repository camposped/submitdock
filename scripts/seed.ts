import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { sql } from 'drizzle-orm'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { directories } from '../db/schema'
import {
  SOURCE_RUSHOUT,
  SOURCE_SUPAPIN,
  parseRushoutReadme,
  parseSeedFile,
  upsertDirectories,
  type UpsertStats,
} from '../lib/seed'

/**
 * The first source is a crawl I ran once, so there is no sensible default path
 * for anyone else. Cloning this repo you do not need it: `npm run import` loads
 * the same 367 domains from the committed snapshot. This script exists for
 * rebuilding the catalog from its sources.
 */
const SUPAPIN_JSON = process.env.SUPAPIN_SEED ?? ''

const SUPAPIN_SEED_AVAILABLE = Boolean(SUPAPIN_JSON) && existsSync(SUPAPIN_JSON)

const RUSHOUT_README_URL =
  'https://api.github.com/repos/rushout09/directory-submission-sites/contents/README.md'

/** Cached so a second seed run works with the network off. */
const RUSHOUT_CACHE = path.join(process.cwd(), 'data', 'rushout09.README.md')

async function loadRushoutReadme(): Promise<{ markdown: string; from: 'network' | 'cache' }> {
  try {
    const response = await fetch(RUSHOUT_README_URL, {
      headers: {
        accept: 'application/vnd.github.raw',
        'user-agent': 'submitdock-seed',
      },
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw new Error(`GitHub responded ${response.status}`)
    const markdown = await response.text()
    mkdirSync(path.dirname(RUSHOUT_CACHE), { recursive: true })
    writeFileSync(RUSHOUT_CACHE, markdown)
    return { markdown, from: 'network' }
  } catch (error) {
    if (existsSync(RUSHOUT_CACHE)) {
      console.warn(`  fetch failed (${(error as Error).message}), using cached README`)
      return { markdown: readFileSync(RUSHOUT_CACHE, 'utf8'), from: 'cache' }
    }
    throw error
  }
}

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

  // Source 1: a crawl of the 251 domains a paid service submitted Supapin to.
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

  // Source 2: the public free-directory list, deduped against source 1.
  const { markdown, from } = await loadRushoutReadme()
  const rushoutRows = parseRushoutReadme(markdown)
  const rushout = upsertDirectories(db, SOURCE_RUSHOUT, rushoutRows, { crawled: false })
  report(SOURCE_RUSHOUT, rushout)
  logEvent(db, {
    action: 'seed.source',
    detail: { readmeFrom: from, ...rushout, insertedDomains: undefined },
  })

  const [{ total }] = db
    .select({ total: sql<number>`count(*)` })
    .from(directories)
    .all()

  console.log('')
  console.log(`  catalog total: ${total} domains`)
  console.log(`  new from ${SOURCE_RUSHOUT}: ${rushout.inserted}`)
  if (rushout.inserted > 0) {
    console.log(`  (these have never been probed, so triage.ts has ${rushout.inserted} to chew on)`)
    writeFileSync(
      path.join(process.cwd(), 'data', 'new-domains.txt'),
      `${rushout.insertedDomains.join('\n')}\n`,
    )
    console.log('  wrote data/new-domains.txt')
  }

  logEvent(db, {
    action: 'seed.done',
    detail: {
      total,
      supapin: supapin ? { inserted: supapin.inserted, updated: supapin.updated } : 'skipped',
      rushout: { inserted: rushout.inserted, updated: rushout.updated },
    },
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
