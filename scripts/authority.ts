import { readFileSync } from 'node:fs'
import path from 'node:path'

import { eq } from 'drizzle-orm'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { directories } from '../db/schema'

/**
 * Writes Semrush Authority Score onto the catalog.
 *
 *   npm run authority -- data/authority.semrush.json
 *
 * The file is a flat map of domain to score, which is what both routes out of
 * Semrush produce: the Batch Comparison CSV pasted into JSON, or a loop over
 * the `backlinks_overview` report asking for `ascore`.
 *
 *   { "producthunt.com": 54, "saashub.com": 40, "gone.example": null }
 *
 * A null is kept as a null. Semrush having no data for a domain is not the
 * same as the domain scoring zero, and writing a 0 there would put it at the
 * bottom of a ranking it was never measured for.
 *
 * This is a separate script rather than part of the seed because authority
 * has a different clock: the catalog changes when a directory appears or
 * dies, the scores change every month.
 */
const file = process.argv[2] ?? path.join(process.cwd(), 'data', 'authority.semrush.json')

let raw: unknown
try {
  raw = JSON.parse(readFileSync(file, 'utf8'))
} catch {
  console.error(`could not read ${file}`)
  console.error('usage: npm run authority -- path/to/scores.json')
  process.exit(1)
}

if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
  console.error('expected an object of { "domain": score }')
  process.exit(1)
}

const db = openDb()
const known = new Set(db.select({ domain: directories.domain }).from(directories).all().map((r) => r.domain))

let updated = 0
let cleared = 0
let unknown = 0

for (const [rawDomain, rawScore] of Object.entries(raw as Record<string, unknown>)) {
  const domain = rawDomain.trim().toLowerCase()
  if (!known.has(domain)) {
    unknown += 1
    continue
  }

  const score =
    typeof rawScore === 'number' && Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : null

  db.update(directories).set({ authorityScore: score }).where(eq(directories.domain, domain)).run()
  if (score === null) cleared += 1
  else updated += 1
}

logEvent(db, {
  action: 'catalog.authority',
  detail: { source: 'semrush', file: path.basename(file), updated, cleared, unknown },
})

console.log(`authority score written from ${path.basename(file)}`)
console.log(`  ${updated} scored, ${cleared} left null (no Semrush data)`)
if (unknown > 0) console.log(`  ${unknown} skipped, not in the catalog`)
