import { eq } from 'drizzle-orm'

import type { Db } from '@/db/connect'
import {
  CAPTCHA_VENDORS,
  DIRECTORY_STATUSES,
  TIERS,
  directories,
  type CaptchaVendor,
  type Directory,
  type DirectoryStatus,
  type Tier,
} from '@/db/schema'
import { mergeSources, normalizeDomain } from '@/lib/domain'

export const SOURCE_SUPAPIN = 'supapin-2025'
export const SOURCE_RUSHOUT = 'rushout09-gh'

/** A domain that has never been probed carries an empty date, not a fake one. */
export const NEVER_CHECKED = ''

/**
 * The four columns that belong to me, not to a crawler. Once a row exists,
 * no seed run may touch them again, which is what makes re-running safe.
 */
export const CURATED_COLUMNS = ['tier', 'categories', 'price', 'notes'] as const

export type CatalogRow = {
  domain: string
  name?: string | null
  submitUrl?: string | null
  tier?: Tier | null
  categories?: string[]
  requiresAccount?: boolean
  requiresCaptcha?: boolean
  requiresPayment?: boolean
  requiresBacklink?: boolean
  captchaVendor?: CaptchaVendor | null
  thirdPartyForm?: boolean
  /** Third party authority, 0 to 100. */
  dr?: number | null
  price?: number | null
  status?: DirectoryStatus
  httpStatus?: number
  lastCheckedAt?: string
  notes?: string | null
}

export type UpsertStats = {
  source: string
  seen: number
  inserted: number
  updated: number
  unchanged: number
  insertedDomains: string[]
}

// -- Source 1: the Supapin crawl -------------------------------------------

type SeedFileRecord = {
  domain: string
  name: string | null
  submitUrl: string | null
  tier: string | null
  categories: string[]
  requires: { account: boolean; captcha: boolean; payment: boolean; backlink: boolean }
  captchaVendor: string | null
  thirdPartyForm: boolean
  price: number | null
  status: string
  httpStatus: number
  lastCheckedAt: string
  notes: string | null
}

function asEnum<T extends string>(allowed: readonly T[], value: unknown): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null
}

/** Flattens the file's nested `requires` object onto the schema's columns. */
export function parseSeedFile(raw: unknown): CatalogRow[] {
  if (!Array.isArray(raw)) throw new Error('directories.seed.json must be an array')

  const rows: CatalogRow[] = []
  for (const record of raw as SeedFileRecord[]) {
    const domain = normalizeDomain(record?.domain)
    if (!domain) continue

    /**
     * A crawl can report a domain as dead, and this catalog does not carry
     * those: a list of places to submit to should not include places that no
     * longer answer. Dropping it here rather than storing a status is what
     * makes the rule survive a re-seed. Mapping it to `alive` instead, which
     * is what removing the enum value alone would have done, would put dead
     * domains back at the top of the ready queue.
     */
    if (record.status === 'dead') continue

    rows.push({
      domain,
      name: record.name ?? null,
      submitUrl: record.submitUrl ?? null,
      tier: asEnum(TIERS, record.tier),
      categories: Array.isArray(record.categories) ? record.categories : [],
      requiresAccount: Boolean(record.requires?.account),
      requiresCaptcha: Boolean(record.requires?.captcha),
      requiresPayment: Boolean(record.requires?.payment),
      requiresBacklink: Boolean(record.requires?.backlink),
      captchaVendor: asEnum(CAPTCHA_VENDORS, record.captchaVendor),
      thirdPartyForm: Boolean(record.thirdPartyForm),
      price: typeof record.price === 'number' ? record.price : null,
      status: asEnum(DIRECTORY_STATUSES, record.status) ?? 'alive',
      httpStatus: typeof record.httpStatus === 'number' ? record.httpStatus : 0,
      lastCheckedAt: record.lastCheckedAt ?? NEVER_CHECKED,
      notes: record.notes ?? null,
    })
  }
  return rows
}

// -- Source 2: the rushout09 README ----------------------------------------

/**
 * The README is one markdown table of directories followed by a second table
 * of paid submission *services*. Requiring the URL cell to be an http link is
 * what keeps that second table out: its third column holds "150", not a link.
 */
function hasPath(url: string) {
  try {
    const { pathname } = new URL(url)
    return pathname.replace(/\/+$/, '').length > 0
  } catch {
    return false
  }
}

export function parseRushoutReadme(markdown: string): CatalogRow[] {
  const byDomain = new Map<string, CatalogRow>()

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue

    const cells = trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())
    if (cells.length < 3) continue

    const [rawName, rawScore, rawUrl, rawPricing] = cells
    if (!/^https?:\/\//i.test(rawUrl)) continue

    const domain = normalizeDomain(rawUrl)
    if (!domain) continue

    const name = rawName.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim() || null

    // Keep the first row for a domain: the list is roughly authority ordered,
    // so the earlier entry is the better one when a site appears twice.
    if (byDomain.has(domain)) continue

    byDomain.set(domain, {
      domain,
      name,
      // Only a URL with a path is worth calling a submitUrl. A bare homepage
      // says nothing about where the form is, and triage.ts can do better.
      submitUrl: hasPath(rawUrl) ? rawUrl : null,
      requiresPayment: /paid/i.test(rawPricing ?? ''),
      // The Score column is a domain authority rating, the objective version of
      // the tier I grade by hand. Ignoring it was leaving real signal on the floor.
      dr: /^\d+$/.test(rawScore ?? '') ? Number(rawScore) : null,
      status: 'alive',
      httpStatus: 0,
      lastCheckedAt: NEVER_CHECKED,
    })
  }

  return [...byDomain.values()]
}

// -- The upsert ------------------------------------------------------------

export type UpsertOptions = {
  /**
   * True when the rows carry real crawl output (source 1). A crawled source may
   * refresh status, flags and dates; a plain list of links may not, so an
   * overlapping domain keeps what was already discovered about it.
   */
  crawled: boolean
}

function isNewer(incoming: string | undefined, existing: string) {
  if (!incoming) return false
  if (!existing) return true
  return incoming >= existing
}

/**
 * Upserts by domain. Curated columns are written once, at insert, and never
 * again, so running the seed twice cannot erase manual work.
 */
export function upsertDirectories(
  db: Db,
  source: string,
  rows: CatalogRow[],
  options: UpsertOptions,
): UpsertStats {
  const stats: UpsertStats = {
    source,
    seen: rows.length,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    insertedDomains: [],
  }

  db.transaction((tx) => {
    for (const row of rows) {
      const [existing] = tx
        .select()
        .from(directories)
        .where(eq(directories.domain, row.domain))
        .limit(1)
        .all()

      if (!existing) {
        tx.insert(directories)
          .values({
            domain: row.domain,
            name: row.name ?? null,
            submitUrl: row.submitUrl ?? null,
            tier: row.tier ?? null,
            categories: JSON.stringify(row.categories ?? []),
            requiresAccount: row.requiresAccount ?? false,
            requiresCaptcha: row.requiresCaptcha ?? false,
            requiresPayment: row.requiresPayment ?? false,
            requiresBacklink: row.requiresBacklink ?? false,
            captchaVendor: row.captchaVendor ?? null,
            thirdPartyForm: row.thirdPartyForm ?? false,
            dr: row.dr ?? null,
            price: row.price ?? null,
            status: row.status ?? 'alive',
            httpStatus: row.httpStatus ?? 0,
            source,
            lastCheckedAt: row.lastCheckedAt ?? NEVER_CHECKED,
            notes: row.notes ?? null,
          })
          .run()
        stats.inserted += 1
        stats.insertedDomains.push(row.domain)
        continue
      }

      const next: Partial<Directory> = {
        source: mergeSources(existing.source, source),
      }

      // Filling a null is not overwriting: source 1 shipped no names at all,
      // and the README has good ones. Same for the authority score, which only
      // the README carries.
      if (!existing.name && row.name) next.name = row.name
      if (existing.dr === null && typeof row.dr === 'number') next.dr = row.dr

      if (options.crawled && isNewer(row.lastCheckedAt, existing.lastCheckedAt)) {
        // A fresher crawl wins on the columns a crawler owns. submitUrl is the
        // exception: a null means "did not find it", which must not delete a
        // URL that triage or I found by hand.
        if (row.submitUrl) next.submitUrl = row.submitUrl
        if (row.name) next.name = row.name
        next.status = row.status ?? existing.status
        next.httpStatus = row.httpStatus ?? existing.httpStatus
        next.lastCheckedAt = row.lastCheckedAt ?? existing.lastCheckedAt
        next.requiresAccount = row.requiresAccount ?? existing.requiresAccount
        next.requiresCaptcha = row.requiresCaptcha ?? existing.requiresCaptcha
        next.requiresPayment = row.requiresPayment ?? existing.requiresPayment
        next.requiresBacklink = row.requiresBacklink ?? existing.requiresBacklink
        next.captchaVendor = row.captchaVendor ?? existing.captchaVendor
        next.thirdPartyForm = row.thirdPartyForm ?? existing.thirdPartyForm
      } else if (!existing.submitUrl && row.submitUrl) {
        next.submitUrl = row.submitUrl
      }

      const changed = Object.entries(next).some(
        ([key, value]) => existing[key as keyof Directory] !== value,
      )
      if (!changed) {
        stats.unchanged += 1
        continue
      }

      tx.update(directories).set(next).where(eq(directories.domain, row.domain)).run()
      stats.updated += 1
    }
  })

  return stats
}
