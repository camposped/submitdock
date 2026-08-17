import { eq } from 'drizzle-orm'

import type { Db } from '@/db/connect'
import { directories, type Directory } from '@/db/schema'
import { mergeSources, normalizeDomain, parseJsonArray } from '@/lib/domain'

/**
 * The portable shape. A plain array sorted by domain, booleans as booleans and
 * categories as a real array, so the committed file gives a readable git diff.
 * No export timestamp on purpose: a re-export with no changes must produce a
 * byte identical file, otherwise every run shows up as a commit.
 */
export type CatalogRecord = {
  domain: string
  name: string | null
  submitUrl: string | null
  tier: string | null
  dr: number | null
  linkRel: string | null
  categories: string[]
  requiresAccount: boolean
  requiresCaptcha: boolean
  requiresPayment: boolean
  requiresBacklink: boolean
  captchaVendor: string | null
  thirdPartyForm: boolean
  price: number | null
  status: string
  httpStatus: number
  source: string
  lastCheckedAt: string
  notes: string | null
}

export function toCatalogRecord(row: Directory): CatalogRecord {
  return {
    domain: row.domain,
    name: row.name,
    submitUrl: row.submitUrl,
    tier: row.tier,
    dr: row.dr,
    linkRel: row.linkRel,
    categories: parseJsonArray(row.categories),
    requiresAccount: row.requiresAccount,
    requiresCaptcha: row.requiresCaptcha,
    requiresPayment: row.requiresPayment,
    requiresBacklink: row.requiresBacklink,
    captchaVendor: row.captchaVendor,
    thirdPartyForm: row.thirdPartyForm,
    price: row.price,
    status: row.status,
    httpStatus: row.httpStatus,
    source: row.source,
    lastCheckedAt: row.lastCheckedAt,
    notes: row.notes,
  }
}

export function exportCatalog(db: Db): CatalogRecord[] {
  return db
    .select()
    .from(directories)
    .all()
    .map(toCatalogRecord)
    .sort((a, b) => a.domain.localeCompare(b.domain))
}

export function serializeCatalog(records: CatalogRecord[]) {
  return `${JSON.stringify(records, null, 2)}\n`
}

export type ImportStats = { seen: number; inserted: number; updated: number; unchanged: number; skipped: number }

/**
 * The way back in. Unlike the seed, this file *is* the catalog, curation
 * included, so it is authoritative on every column. `source` is the one
 * exception: origins are merged rather than replaced, so importing a snapshot
 * taken before a source was added does not forget that source.
 */
export function importCatalog(db: Db, records: unknown): ImportStats {
  if (!Array.isArray(records)) throw new Error('catalog export must be a JSON array')

  const stats: ImportStats = { seen: records.length, inserted: 0, updated: 0, unchanged: 0, skipped: 0 }

  db.transaction((tx) => {
    for (const raw of records as CatalogRecord[]) {
      const domain = normalizeDomain(raw?.domain)
      if (!domain) {
        stats.skipped += 1
        continue
      }

      const [existing] = tx.select().from(directories).where(eq(directories.domain, domain)).limit(1).all()

      const values = {
        domain,
        name: raw.name ?? null,
        submitUrl: raw.submitUrl ?? null,
        tier: (raw.tier ?? null) as Directory['tier'],
        dr: typeof raw.dr === 'number' ? raw.dr : null,
        linkRel: (raw.linkRel ?? null) as Directory['linkRel'],
        categories: JSON.stringify(Array.isArray(raw.categories) ? raw.categories : []),
        requiresAccount: Boolean(raw.requiresAccount),
        requiresCaptcha: Boolean(raw.requiresCaptcha),
        requiresPayment: Boolean(raw.requiresPayment),
        requiresBacklink: Boolean(raw.requiresBacklink),
        captchaVendor: (raw.captchaVendor ?? null) as Directory['captchaVendor'],
        thirdPartyForm: Boolean(raw.thirdPartyForm),
        price: typeof raw.price === 'number' ? raw.price : null,
        status: (raw.status ?? 'alive') as Directory['status'],
        httpStatus: typeof raw.httpStatus === 'number' ? raw.httpStatus : 0,
        source: existing ? mergeSources(existing.source, raw.source ?? '') : (raw.source ?? 'import'),
        lastCheckedAt: raw.lastCheckedAt ?? '',
        notes: raw.notes ?? null,
      }

      if (!existing) {
        tx.insert(directories).values(values).run()
        stats.inserted += 1
        continue
      }

      const changed = (Object.keys(values) as (keyof typeof values)[]).some(
        (key) => existing[key] !== values[key],
      )
      if (!changed) {
        stats.unchanged += 1
        continue
      }

      tx.update(directories).set(values).where(eq(directories.domain, domain)).run()
      stats.updated += 1
    }
  })

  return stats
}
