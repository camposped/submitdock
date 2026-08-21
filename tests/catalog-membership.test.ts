import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { eq } from 'drizzle-orm'

import { catalogDomains, catalogs } from '@/db/schema'
import { exportCatalog, importCatalog } from '@/lib/catalog-io'

import { makeTestDb } from './helpers'

/**
 * Membership is the one thing in the snapshot that cannot be rebuilt from a
 * domain. Facts about a directory can be re-crawled; which curator's list named
 * it cannot be recovered from anything but this file.
 *
 * These tests exist because it was lost once. A bare import filed every record
 * into the shipped default catalog, and only the committed snapshot made the
 * real membership recoverable.
 */
describe('catalog membership survives a round trip', () => {
  let harness: ReturnType<typeof makeTestDb>

  beforeEach(() => {
    harness = makeTestDb()
  })
  afterEach(() => harness.cleanup())

  const record = (domain: string, catalogs: string[]) => ({
    domain,
    name: null,
    submitUrl: null,
    tier: null,
    authorityScore: null,
    linkRel: null,
    categories: [],
    requiresAccount: false,
    requiresCaptcha: false,
    requiresPayment: false,
    requiresBacklink: false,
    captchaVendor: null,
    thirdPartyForm: false,
    price: null,
    status: 'alive',
    httpStatus: 200,
    source: 'catalog-1',
    lastCheckedAt: '2026-08-21',
    catalogs,
  })

  const snapshot = [
    record('one.com', ['catalog-1']),
    record('both.com', ['catalog-1', 'catalog-2']),
    record('two.com', ['catalog-2']),
  ]

  it('keeps each domain in exactly the lists that named it', () => {
    importCatalog(harness.db, snapshot)

    const out = exportCatalog(harness.db)
    const by = Object.fromEntries(out.map((r) => [r.domain, (r.catalogs ?? []).sort()]))

    expect(by['one.com']).toEqual(['catalog-1'])
    expect(by['two.com']).toEqual(['catalog-2'])
    expect(by['both.com']).toEqual(['catalog-1', 'catalog-2'])
  })

  it('shares one row of facts between two lists that both name a domain', () => {
    importCatalog(harness.db, snapshot)

    const rows = harness.db.select().from(catalogDomains).all()
    expect(rows).toHaveLength(4) // 1 + 2 + 1, not 3 copies of a directory
    expect(exportCatalog(harness.db)).toHaveLength(3)
  })

  /**
   * The regression. `into` names one catalog to file everything under, which is
   * right for a curator's raw list and catastrophic for a snapshot that already
   * knows better.
   */
  it('does not let one target catalog swallow a snapshot that declares its own', () => {
    importCatalog(harness.db, snapshot)
    importCatalog(harness.db, exportCatalog(harness.db))

    const by = Object.fromEntries(
      exportCatalog(harness.db).map((r) => [r.domain, (r.catalogs ?? []).sort()]),
    )
    expect(by['two.com']).toEqual(['catalog-2'])
    expect(by['both.com']).toEqual(['catalog-1', 'catalog-2'])
  })

  /**
   * The snapshot carries membership but no catalog metadata, so importing it
   * has to invent a display name. A raw slug in the switcher is the tell that
   * a fresh clone got a worse experience than the machine the file came from.
   */
  it('names an auto created catalog for a person, not as a raw slug', () => {
    importCatalog(harness.db, [record('one.com', ['catalog-2'])])

    const row = harness.db.select().from(catalogs).where(eq(catalogs.slug, 'catalog-2')).get()

    expect(row?.name).toBe('Catalog 2')
  })
})
