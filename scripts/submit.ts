import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { and, eq } from 'drizzle-orm'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import {
  SUBMISSION_STATES,
  directories,
  products,
  submissions,
  type SubmissionState,
} from '../db/schema'
import { formatDuration } from '../lib/timing'

/**
 * How the agent records one attempt at one directory.
 *
 *   npm run submit -- begin saashub.com --product northwind
 *   npm run submit -- done saashub.com --product northwind --state submitted \
 *     --shot /tmp/saashub.png --listing-url https://saashub.com/northwind
 *   npm run submit -- done techinasia.com --product northwind --state todo \
 *     --note "Editorial picks only, not an open directory" --shot /tmp/tia.png
 *
 * `begin` and `done` exist as two commands so the clock belongs to the tool.
 * A single command taking --seconds would be asking the agent how long it
 * took, and AGENTS.md is explicit that a result the agent invents is worse
 * than no result. Here the duration is a subtraction the script does.
 *
 * The screenshot is copied into data/shots rather than registered where it
 * lies, because evidence that a temp file can overwrite is not evidence.
 */
const [command, ...rest] = process.argv.slice(2)

function flag(name: string): string | undefined {
  const index = rest.indexOf(`--${name}`)
  if (index === -1) return undefined
  const value = rest[index + 1]
  return value && !value.startsWith('--') ? value : ''
}

function positionals(): string[] {
  const out: string[] = []
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i].startsWith('--')) {
      const next = rest[i + 1]
      if (next && !next.startsWith('--')) i += 1
      continue
    }
    out.push(rest[i])
  }
  return out
}

const SHOT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

function die(message: string): never {
  console.error(message)
  process.exit(1)
}

const db = openDb()
const args = positionals()
const domain = args[0]?.trim().toLowerCase()
const productSlug = flag('product')?.trim()

if (command !== 'begin' && command !== 'done') {
  die('commands: begin, done\n  npm run submit -- begin <domain> --product <slug>\n  npm run submit -- done <domain> --product <slug> --state submitted [--shot p] [--listing-url u] [--note n]')
}
if (!domain) die('a domain is required: npm run submit -- ' + command + ' saashub.com --product northwind')
if (!productSlug) die('--product is required, so the row can only be the crossing you meant')

const product = db.select().from(products).where(eq(products.slug, productSlug)).get()
if (!product) die(`no product "${productSlug}". npm run seed:products adds them.`)

const directory = db.select().from(directories).where(eq(directories.domain, domain)).get()
if (!directory) die(`"${domain}" is not in the catalog, so there is nothing to attach this to`)

/** Rows are lazy, so the first touch is what creates one. */
function ensureRow() {
  const found = db
    .select()
    .from(submissions)
    .where(and(eq(submissions.productSlug, productSlug!), eq(submissions.domain, domain!)))
    .get()
  if (found) return found

  db.insert(submissions).values({ productSlug: productSlug!, domain: domain! }).run()
  return db
    .select()
    .from(submissions)
    .where(and(eq(submissions.productSlug, productSlug!), eq(submissions.domain, domain!)))
    .get()!
}

/**
 * Takes custody of the screenshot: copies it under data/shots/<slug>/ and
 * returns the new absolute path. Collisions get a counter rather than
 * overwriting, the same rule the product asset upload follows.
 */
function keepShot(source: string): string {
  const resolved = path.resolve(source)
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    die(`--shot ${source} is not a file on disk`)
  }
  const extension = path.extname(resolved).toLowerCase()
  if (!SHOT_EXTENSIONS.has(extension)) {
    die(`--shot must be one of ${[...SHOT_EXTENSIONS].join(', ')}, got "${extension || 'no extension'}"`)
  }

  const dir = path.join(process.cwd(), 'data', 'shots', productSlug!)
  mkdirSync(dir, { recursive: true })

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const base = `${domain!.replace(/[^a-z0-9.-]+/g, '-')}-${stamp}`
  let target = path.join(dir, `${base}${extension}`)
  let counter = 2
  while (existsSync(target)) {
    target = path.join(dir, `${base}-${counter}${extension}`)
    counter += 1
  }

  copyFileSync(resolved, target)
  return target
}

if (command === 'begin') {
  const row = ensureRow()
  const startedAt = new Date().toISOString()
  db.update(submissions)
    .set({ attemptStartedAt: startedAt })
    .where(eq(submissions.id, row.id))
    .run()
  logEvent(db, { action: 'submission.begin', productSlug, domain, detail: { startedAt } })
  console.log(`clock started on ${domain}`)
  process.exit(0)
}

// done
const state = (flag('state') || 'submitted').trim()
if (!(SUBMISSION_STATES as readonly string[]).includes(state)) {
  die(`--state must be one of ${SUBMISSION_STATES.join(', ')}`)
}

const row = ensureRow()
const now = new Date()

/**
 * No `begin` means no duration. Guessing one from the event log would be
 * inventing the very number this pair of commands exists to measure, so the
 * row simply carries null and the dashboard counts it as untimed.
 */
const durationMs = row.attemptStartedAt
  ? Math.max(0, now.getTime() - new Date(row.attemptStartedAt).getTime())
  : null

const shot = flag('shot') ? keepShot(flag('shot')!) : row.screenshotPath
const listingUrl = flag('listing-url')
const note = flag('note')

db.update(submissions)
  .set({
    state: state as SubmissionState,
    attemptStartedAt: null,
    ...(durationMs !== null ? { durationMs } : {}),
    ...(shot ? { screenshotPath: shot } : {}),
    ...(listingUrl !== undefined
      ? { listingUrl: listingUrl || null, backlinkLive: null, backlinkRel: null, lastVerifiedAt: null }
      : {}),
    ...(note !== undefined ? { notes: note || null } : {}),
    submittedAt:
      state === 'submitted' && !row.submittedAt ? now.toISOString() : row.submittedAt,
  })
  .where(eq(submissions.id, row.id))
  .run()

logEvent(db, {
  action: 'submission.done',
  productSlug,
  domain,
  ok: state === 'submitted' || state === 'live',
  detail: { state, durationMs, shot: shot ?? null, listingUrl: listingUrl ?? null },
})

const timing = durationMs === null ? 'untimed, no begin' : formatDuration(durationMs)
console.log(`${domain}: ${state}, ${timing}${shot ? ', screenshot kept' : ''}`)
