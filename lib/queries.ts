import 'server-only'

import { and, desc, eq, sql } from 'drizzle-orm'

import { timeSaved, type TimeSaved } from '@/lib/timing'
import { db } from '@/db'
import {
  directories,
  events,
  products,
  submissions,
  type Directory,
  type Submission,
} from '@/db/schema'

export type CatalogRow = Directory & {
  submission: Pick<
    Submission,
    | 'state'
    | 'listingUrl'
    | 'backlinkLive'
    | 'backlinkRel'
    | 'lastVerifiedAt'
    | 'notes'
    | 'durationMs'
    | 'screenshotPath'
  > | null
}

export type CatalogFilters = {
  q?: string
  status?: string
  tier?: string
  submitUrl?: 'yes' | 'no'
  state?: string
  requires?: string[]
  /** Minimum Domain Rating, or 'none' for the ones nobody has scored. */
  dr?: string
  /** What the directory hands out, learned from verify: dofollow, nofollow, unknown. */
  linkRel?: string
  /** 'domain' goes alphabetical; anything else keeps the DR ranking default. */
  sort?: string
}

export function listProducts() {
  return db.select().from(products).orderBy(products.name).all()
}

export function getProduct(slug: string) {
  const [row] = db.select().from(products).where(eq(products.slug, slug)).limit(1).all()
  return row ?? null
}

/**
 * One query for the whole catalog, left joined to the selected product so each
 * row can carry that product's submission state. Filtering happens in JS: 367
 * rows is nothing, and it keeps the flag filters readable.
 */
export function listCatalog(productSlug: string | null, filters: CatalogFilters = {}): CatalogRow[] {
  const rows = productSlug
    ? db
        .select({
          directory: directories,
          state: submissions.state,
          listingUrl: submissions.listingUrl,
          backlinkLive: submissions.backlinkLive,
          backlinkRel: submissions.backlinkRel,
          lastVerifiedAt: submissions.lastVerifiedAt,
          notes: submissions.notes,
          durationMs: submissions.durationMs,
          screenshotPath: submissions.screenshotPath,
        })
        .from(directories)
        .leftJoin(
          submissions,
          and(eq(submissions.domain, directories.domain), eq(submissions.productSlug, productSlug)),
        )
        .orderBy(directories.domain)
        .all()
        .map<CatalogRow>((r) => ({
          ...r.directory,
          submission: r.state
            ? {
                state: r.state,
                listingUrl: r.listingUrl,
                backlinkLive: r.backlinkLive,
                backlinkRel: r.backlinkRel,
                lastVerifiedAt: r.lastVerifiedAt,
                notes: r.notes,
                durationMs: r.durationMs,
                screenshotPath: r.screenshotPath,
              }
            : null,
        }))
    : db
        .select()
        .from(directories)
        .orderBy(directories.domain)
        .all()
        .map<CatalogRow>((d) => ({ ...d, submission: null }))

  const kept = rows.filter((row) => matches(row, filters))

  // Authority first by default: the question this list answers is "what is
  // worth my time next", and a domain nobody has rated is not the answer, so
  // the unrated sink to the bottom rather than sorting as zero. Alphabetical is
  // still one click away for when you are hunting a specific domain.
  if (filters.sort === 'domain') return kept
  return [...kept].sort((a, b) => (b.dr ?? -1) - (a.dr ?? -1) || a.domain.localeCompare(b.domain))
}

function matches(row: CatalogRow, f: CatalogFilters) {
  if (f.q) {
    const needle = f.q.toLowerCase()
    const haystack = [row.domain, row.name, row.notes, row.categories].join(' ').toLowerCase()
    if (!haystack.includes(needle)) return false
  }
  if (f.status && row.status !== f.status) return false
  if (f.tier && (row.tier ?? 'none') !== f.tier) return false
  if (f.submitUrl === 'yes' && !row.submitUrl) return false
  if (f.submitUrl === 'no' && row.submitUrl) return false
  if (f.state && (row.submission?.state ?? 'todo') !== f.state) return false

  if (f.dr === 'none' && row.dr !== null) return false
  if (f.dr && f.dr !== 'none') {
    const floor = Number(f.dr)
    if (!Number.isFinite(floor) || row.dr === null || row.dr < floor) return false
  }

  if (f.linkRel === 'unknown' && row.linkRel !== null) return false
  if (f.linkRel && f.linkRel !== 'unknown' && row.linkRel !== f.linkRel) return false

  for (const flag of f.requires ?? []) {
    if (flag === 'account' && !row.requiresAccount) return false
    if (flag === 'captcha' && !row.requiresCaptcha) return false
    if (flag === 'payment' && !row.requiresPayment) return false
    if (flag === 'backlink' && !row.requiresBacklink) return false
    if (flag === 'thirdPartyForm' && !row.thirdPartyForm) return false
  }
  return true
}

export type CampaignStats = {
  catalogTotal: number
  alive: number
  todo: number
  skipped: number
  submitted: number
  verified: number
  live: number
  rejected: number
  /** Submissions that left `todo`, which is the denominator that matters. */
  worked: number
  backlinksLive: number
  dofollow: number
  nofollow: number
  /** Alive, has a form, nothing blocking, and not yet touched. */
  readyToSend: number
  /** Mutually exclusive outcomes over everything attempted, for the donut. */
  waiting: number
  deadEnd: number
  attempted: number
  /**
   * What the agent's clock adds up to. `timed` is separate from `attempted`
   * on purpose: attempts made before this was measured, or recorded without a
   * `submit begin`, carry no duration, and folding them in at an average
   * would be inventing the number.
   */
  time: TimeSaved
}

/**
 * The panel's numbers. `backlinksLive` over `submitted` is the rate the whole
 * tool exists to show: the paid service reported submissions, never links.
 */
export function getCampaignStats(productSlug: string | null): CampaignStats {
  const [{ catalogTotal, alive }] = db
    .select({
      catalogTotal: sql<number>`count(*)`,
      alive: sql<number>`sum(case when ${directories.status} = 'alive' then 1 else 0 end)`,
    })
    .from(directories)
    .all()

  const empty: CampaignStats = {
    catalogTotal,
    alive: alive ?? 0,
    todo: 0,
    skipped: 0,
    submitted: 0,
    verified: 0,
    live: 0,
    rejected: 0,
    worked: 0,
    backlinksLive: 0,
    dofollow: 0,
    nofollow: 0,
    readyToSend: 0,
    waiting: 0,
    deadEnd: 0,
    attempted: 0,
    time: timeSaved([]),
  }
  if (!productSlug) {
    return { ...empty, readyToSend: listCatalog(null).filter(isReadyToSend).length }
  }

  const rows = db
    .select({
      state: submissions.state,
      backlinkLive: submissions.backlinkLive,
      rel: submissions.backlinkRel,
      lastVerifiedAt: submissions.lastVerifiedAt,
      durationMs: submissions.durationMs,
    })
    .from(submissions)
    .where(eq(submissions.productSlug, productSlug))
    .all()

  const stats = {
    ...empty,
    readyToSend: listCatalog(productSlug).filter(isReadyToSend).length,
    time: timeSaved(rows.map((row) => row.durationMs)),
  }
  for (const row of rows) {
    stats[row.state] += 1
    if (row.state !== 'todo') stats.worked += 1
    if (row.backlinkLive) {
      stats.backlinksLive += 1
      if (row.rel === 'dofollow') stats.dofollow += 1
      if (row.rel === 'nofollow') stats.nofollow += 1
    }

    // The donut's three buckets. Every attempted row lands in exactly one, so
    // the slices sum to the ring and none of them double counts.
    if (row.state === 'todo' || row.state === 'skipped') continue
    stats.attempted += 1
    if (row.backlinkLive) continue
    if (row.state === 'rejected' || (row.lastVerifiedAt && !row.backlinkLive)) stats.deadEnd += 1
    else stats.waiting += 1
  }
  return stats
}

/**
 * Product scoped events keep the catalog wide entries (seeds, probes, imports)
 * in view, because those explain the campaign too.
 */
export function listEvents(limit = 40, productSlug?: string | null) {
  const base = db.select().from(events)
  const scoped = productSlug
    ? base.where(sql`${events.productSlug} = ${productSlug} or ${events.productSlug} is null`)
    : base
  return scoped.orderBy(desc(events.id)).limit(limit).all()
}

/**
 * Directories the agent cannot finish on its own. Not a submission state: it
 * is a property of the DIRECTORY (captcha, account, payment, reciprocal link),
 * which is why it lives as a catalog filter rather than a screen of its own.
 * Dead domains are left out, because a captcha on a dead site is not a task.
 */
export function isReadyToSend(row: CatalogRow) {
  return (
    row.status === 'alive' &&
    Boolean(row.submitUrl) &&
    (row.submission?.state ?? 'todo') === 'todo' &&
    !row.requiresCaptcha &&
    !row.requiresAccount &&
    !row.requiresPayment &&
    !row.requiresBacklink
  )
}

export function needsHuman(row: CatalogRow) {
  return (
    row.status !== 'dead' &&
    (row.submission?.state ?? 'todo') !== 'skipped' &&
    !row.submission?.backlinkLive &&
    (row.requiresCaptcha || row.requiresAccount || row.requiresPayment || row.requiresBacklink)
  )
}

export function countNeedsHuman(productSlug: string | null): number {
  return listCatalog(productSlug).filter(needsHuman).length
}

export type SubmissionRow = CatalogRow & {
  submission: NonNullable<CatalogRow['submission']> & {
    submittedAt: string | null
    durationMs: number | null
    screenshotPath: string | null
    /** Non-null while an attempt is in flight, which is a row being worked on. */
    attemptStartedAt: string | null
  }
  /** The last thing a script or a click reported about this domain. */
  lastEvent: { action: string; at: string; ok: boolean; detail: string } | null
}

/**
 * Every directory this product actually tried, with what came of it.
 *
 * "Tried" means a state was set or a listing URL was pasted. A bare `todo` row
 * exists the moment a sheet is saved, and calling that an attempt would put
 * rows here that nothing was ever done to.
 */
export function listSubmissions(productSlug: string | null): SubmissionRow[] {
  if (!productSlug) return []

  const rows = db
    .select({
      domain: submissions.domain,
      state: submissions.state,
      submittedAt: submissions.submittedAt,
      durationMs: submissions.durationMs,
      screenshotPath: submissions.screenshotPath,
      attemptStartedAt: submissions.attemptStartedAt,
    })
    .from(submissions)
    .where(eq(submissions.productSlug, productSlug))
    .all()

  const attempted = new Map(rows.map((r) => [r.domain, r]))

  // One pass over the events for this product, newest first, keeping the first
  // one seen per domain. Cheaper than a correlated subquery per row and the
  // table is small.
  const latest = new Map<string, { action: string; at: string; ok: boolean; detail: string }>()
  for (const event of db
    .select()
    .from(events)
    .where(eq(events.productSlug, productSlug))
    .orderBy(desc(events.id))
    .all()) {
    if (!event.domain || latest.has(event.domain)) continue
    latest.set(event.domain, {
      action: event.action,
      at: event.at,
      ok: event.ok,
      detail: event.detail,
    })
  }

  return listCatalog(productSlug)
    .filter((row) => {
      const hit = attempted.get(row.domain)
      return Boolean(hit) && (hit!.state !== 'todo' || Boolean(row.submission?.listingUrl))
    })
    .map((row) => ({
      ...row,
      submission: {
        ...row.submission!,
        submittedAt: attempted.get(row.domain)?.submittedAt ?? null,
        durationMs: attempted.get(row.domain)?.durationMs ?? null,
        screenshotPath: attempted.get(row.domain)?.screenshotPath ?? null,
        attemptStartedAt: attempted.get(row.domain)?.attemptStartedAt ?? null,
      },
      lastEvent: latest.get(row.domain) ?? null,
    }))
    // Ranked by authority like the catalog, so the two lists agree on which
    // rows matter most. Recency is still readable in the Sent column.
    .sort((a, b) => (b.dr ?? -1) - (a.dr ?? -1) || a.domain.localeCompare(b.domain))
}

