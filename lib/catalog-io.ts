import { eq } from 'drizzle-orm'

import type { Db } from '@/db/connect'
import { catalogDomains, catalogs, directories, type Directory } from '@/db/schema'
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
  authorityScore: number | null
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
  /** Slugs of every list that names this domain. */
  catalogs?: string[]
  lastCheckedAt: string
  notes: string | null
}

export function toCatalogRecord(row: Directory): CatalogRecord {
  return {
    domain: row.domain,
    name: row.name,
    submitUrl: row.submitUrl,
    tier: row.tier,
    authorityScore: row.authorityScore,
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

/**
 * Membership travels with the snapshot.
 *
 * "The catalog is portable, the database is not" stops being true the moment
 * the lists live only in the .db file: moving machines would keep every domain
 * and lose which curator named it. So each record carries the slugs it belongs
 * to, and the header row carries what those slugs mean.
 */
export function exportCatalog(db: Db): CatalogRecord[] {
  const membership = new Map<string, string[]>()
  for (const row of db.select().from(catalogDomains).all()) {
    membership.set(row.domain, [...(membership.get(row.domain) ?? []), row.catalogSlug].sort())
  }

  return db
    .select()
    .from(directories)
    .all()
    .map((row) => ({ ...toCatalogRecord(row), catalogs: membership.get(row.domain) ?? [] }))
    .sort((a, b) => a.domain.localeCompare(b.domain))
}

/** The lists themselves, so an import can recreate them with their names. */
export function exportCatalogs(db: Db) {
  return db.select().from(catalogs).orderBy(catalogs.slug).all()
}

export function serializeCatalog(records: CatalogRecord[]) {
  return `${JSON.stringify(records, null, 2)}\n`
}

export type ImportStats = {
  seen: number
  inserted: number
  updated: number
  unchanged: number
  skipped: number
  /** Domains filed into the target catalog, new or already known. */
  filed: number
}

/**
 * The way back in. Unlike the seed, this file *is* the catalog, curation
 * included, so it is authoritative on every column. `source` is the one
 * exception: origins are merged rather than replaced, so importing a snapshot
 * taken before a source was added does not forget that source.
 */
/**
 * Where the imported domains are filed.
 *
 * A catalog is a membership, so importing a new list never duplicates a domain
 * that is already known: it adds the join row and leaves the facts alone. That
 * is the whole reason two curators disagreeing about a domain costs nothing
 * here, and why "only here" is a number worth showing.
 */
export type ImportInto = {
  slug: string
  name?: string
  description?: string
  sourceUrl?: string | null
}

/**
 * Restores the memberships a snapshot declares, so a moved database keeps
 * knowing which curator named which domain. Unknown slugs create a bare
 * catalog rather than being dropped: a name is recoverable, a membership is
 * not.
 */
function fileDeclared(raw: CatalogRecord, domain: string, tx: Parameters<Parameters<Db['transaction']>[0]>[0]) {
  for (const slug of raw.catalogs ?? []) {
    tx.insert(catalogs).values({ slug, name: slug }).onConflictDoNothing().run()
    tx.insert(catalogDomains).values({ catalogSlug: slug, domain }).onConflictDoNothing().run()
  }
}

export function importCatalog(db: Db, records: unknown, into?: ImportInto): ImportStats {
  if (!Array.isArray(records)) throw new Error('catalog export must be a JSON array')

  const stats: ImportStats = {
    seen: records.length,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    filed: 0,
  }

  db.transaction((tx) => {
    if (into) {
      const known = tx.select().from(catalogs).where(eq(catalogs.slug, into.slug)).get()
      if (!known) {
        tx.insert(catalogs)
          .values({
            slug: into.slug,
            name: into.name ?? into.slug,
            description: into.description ?? '',
            sourceUrl: into.sourceUrl ?? null,
          })
          .run()
      }
    }

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
        authorityScore: typeof raw.authorityScore === 'number' ? raw.authorityScore : null,
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

      /*
       * The directory row first, then membership. The join has a foreign key
       * on domain, and a new list is exactly the case that brings domains
       * nobody has a row for yet.
       */
      const file = () => {
        if (!into) return
        tx.insert(catalogDomains)
          .values({ catalogSlug: into.slug, domain })
          .onConflictDoNothing()
          .run()
        stats.filed += 1
      }

      if (!existing) {
        tx.insert(directories).values(values).run()
        file()
        fileDeclared(raw, domain, tx)
        stats.inserted += 1
        continue
      }

      file()
      fileDeclared(raw, domain, tx)

      /*
       * A curator's list names domains. It is not authority over them.
       *
       * The repo's own snapshot is authoritative on every column, which is
       * what the merge below assumes. A third party list is the opposite: it
       * usually carries a domain and nothing else, and letting it through the
       * same path blanked the authority score and the submit URL of every
       * domain the two lists had in common. So an import into a catalog only
       * ever fills a null, and never overwrites a fact something else learned.
       */
      if (into) {
        const fills: Record<string, unknown> = {}
        for (const key of Object.keys(values) as (keyof typeof values)[]) {
          if (key === 'domain' || key === 'source') continue
          const incoming = values[key]

          /*
           * A blocker flag may switch on, never off.
           *
           * These columns are `notNull().default(false)`, so a false means
           * "nobody said otherwise", not "we checked and it is open". A
           * curator saying a site needs an account is real information and
           * has to be able to beat that default, or Facebook and LinkedIn sit
           * in the ready queue looking like free wins. The reverse is not
           * true: nothing gets to clear a blocker somebody recorded.
           */
          if (incoming === true && existing[key] === false) {
            fills[key] = true
            continue
          }

          const isEmpty =
            existing[key] === null || existing[key] === '' || existing[key] === '[]'
          const brings =
            incoming !== null && incoming !== '' && incoming !== '[]' && incoming !== false && incoming !== 0
          if (isEmpty && brings) fills[key] = incoming
        }
        // `source` is deliberately untouched here. Membership lives in
        // catalog_domains now, and writing the same fact in two places is how
        // the two drift apart.

        if (Object.keys(fills).length === 0) {
          stats.unchanged += 1
          continue
        }
        tx.update(directories).set(fills as Partial<Directory>).where(eq(directories.domain, domain)).run()
        stats.updated += 1
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
