import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { directories } from '@/db/schema'
import { exportCatalog, importCatalog, toCatalogRecord } from '@/lib/catalog-io'

import { makeTestDb } from './helpers'

/**
 * The playbook is the one field on the catalog that only exists because an
 * agent bothered to write it down, and it is worthless if a round trip through
 * the committed snapshot drops it. That failure would be silent: the app keeps
 * working, the export still has 343 domains, and the knowledge is just gone on
 * the next clone.
 *
 * So these tests guard the trip, not the writing.
 */
describe('playbook survives the catalog round trip', () => {
  let harness: ReturnType<typeof makeTestDb>

  beforeEach(() => {
    harness = makeTestDb()
  })
  afterEach(() => harness.cleanup())

  const base = {
    domain: 'example.com',
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
    source: 'test',
    lastCheckedAt: '2026-08-21',
    notes: null,
  }

  const LESSON = 'The /submit page is a decoy. The real form is /services/submit.'

  it('exports what was imported', () => {
    importCatalog(harness.db, [{ ...base, playbook: LESSON }])

    const out = exportCatalog(harness.db)
    expect(out).toHaveLength(1)
    expect(out[0].playbook).toBe(LESSON)
  })

  it('carries a null through rather than inventing a string', () => {
    importCatalog(harness.db, [{ ...base }])
    expect(exportCatalog(harness.db)[0].playbook).toBeNull()
  })

  it('keeps the agent’s field report separate from the curator’s notes', () => {
    importCatalog(harness.db, [{ ...base, notes: 'Pedro rates this one highly', playbook: LESSON }])

    const row = harness.db
      .select()
      .from(directories)
      .where(eq(directories.domain, 'example.com'))
      .get()

    expect(row?.notes).toBe('Pedro rates this one highly')
    expect(row?.playbook).toBe(LESSON)
    expect(toCatalogRecord(row!).playbook).toBe(LESSON)
  })

  /**
   * The snapshot in this repo is authoritative on every column, so a re-import
   * of it has to be able to replace a playbook with a newer one. This is the
   * opposite of the curator-list rule, where an import may only fill a null.
   */
  it('lets a later reading replace an earlier one', () => {
    importCatalog(harness.db, [{ ...base, playbook: 'They want a logo under 2MB' }])
    importCatalog(harness.db, [{ ...base, playbook: LESSON }])

    expect(exportCatalog(harness.db)[0].playbook).toBe(LESSON)
  })
})
