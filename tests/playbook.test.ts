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

  /**
   * The rule this file exists to defend. `notes` is the field the dialog
   * labels "Yours", and it must never reach the committed snapshot: an
   * imported list once carried its author's private scoring vocabulary and
   * the URLs of listings they had already won, straight into a public repo.
   * Anything about a directory worth publishing goes in `playbook`.
   */
  it('never carries the private notes field into the snapshot', () => {
    importCatalog(harness.db, [{ ...base, playbook: LESSON }])
    harness.db
      .update(directories)
      .set({ notes: 'a private thought about this list' })
      .where(eq(directories.domain, 'example.com'))
      .run()

    const row = harness.db
      .select()
      .from(directories)
      .where(eq(directories.domain, 'example.com'))
      .get()

    // Still on the machine, for whoever wrote it.
    expect(row?.notes).toBe('a private thought about this list')

    // And absent from everything that leaves it.
    const record = toCatalogRecord(row!)
    expect(record.playbook).toBe(LESSON)
    expect('notes' in record).toBe(false)
    expect(JSON.stringify(exportCatalog(harness.db))).not.toContain('a private thought')
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
