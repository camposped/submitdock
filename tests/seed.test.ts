import { existsSync, readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { directories } from '@/db/schema'
import { normalizeDomain } from '@/lib/domain'
import {
  SOURCE_CRAWL,
  parseSeedFile,
  upsertDirectories,
  type CatalogRow,
} from '@/lib/seed'

import { makeTestDb } from './helpers'

/**
 * The real crawl is not in this repo, so only the suite that asserts its exact
 * counts needs it. Everything about how the merge behaves runs off the fixture
 * below, on a fresh clone, because those are the rules worth protecting: a
 * clone that cannot test idempotence is a clone that can lose your curation.
 *
 * Point CRAWL_SEED at a crawl file to run the counts too.
 */
const CRAWL_JSON = process.env.CRAWL_SEED ?? ''
const hasCrawl = Boolean(CRAWL_JSON) && existsSync(CRAWL_JSON)
const describeCrawl = hasCrawl ? describe : describe.skip

/** Loaded lazily: describe.skip still runs its callback during collection. */
const crawlFile = () => parseSeedFile(JSON.parse(readFileSync(CRAWL_JSON, 'utf8')))

/**
 * A crawl in miniature, in the shape the real file has. One of everything the
 * merge has to handle: a graded row, a row with no form found, and a blocked
 * one. No dead row, because parseSeedFile drops those before this stage.
 */
const CRAWLED: CatalogRow[] = [
  {
    domain: 'saashub.com',
    name: null,
    submitUrl: 'https://saashub.com/submit',
    tier: 'a',
    categories: [],
    requiresAccount: true,
    requiresCaptcha: false,
    requiresPayment: false,
    requiresBacklink: false,
    captchaVendor: null,
    thirdPartyForm: false,
    price: null,
    status: 'alive',
    httpStatus: 200,
    lastCheckedAt: '2026-08-17',
    notes: null,
  },
  {
    domain: 'spa-directory.dev',
    name: null,
    submitUrl: null,
    tier: null,
    categories: [],
    requiresAccount: false,
    requiresCaptcha: true,
    requiresPayment: false,
    requiresBacklink: false,
    captchaVendor: 'recaptcha',
    thirdPartyForm: false,
    price: null,
    status: 'alive',
    httpStatus: 200,
    lastCheckedAt: '2026-08-17',
    notes: 'submitUrl not found in the static HTML, probably a SPA',
  },
  {
    domain: 'antibot.example',
    name: null,
    submitUrl: null,
    tier: null,
    categories: [],
    requiresAccount: false,
    requiresCaptcha: false,
    requiresPayment: false,
    requiresBacklink: false,
    captchaVendor: null,
    thirdPartyForm: false,
    price: null,
    status: 'blocked',
    httpStatus: 403,
    lastCheckedAt: '2026-08-17',
    notes: null,
  },
  {
    domain: 'walled.example',
    name: null,
    submitUrl: null,
    tier: null,
    categories: [],
    requiresAccount: false,
    requiresCaptcha: false,
    requiresPayment: false,
    requiresBacklink: false,
    captchaVendor: null,
    thirdPartyForm: false,
    price: null,
    status: 'blocked',
    httpStatus: 403,
    lastCheckedAt: '2026-08-17',
    notes: null,
  },
]


let harness: ReturnType<typeof makeTestDb>

beforeEach(() => {
  harness = makeTestDb()
})
afterEach(() => harness.cleanup())


describe('parsing a crawl file', () => {
  /**
   * The catalog does not carry domains that no longer answer, and the rule
   * lives here rather than in a status column so a re-seed cannot undo it.
   * Dropping the value from the enum alone would have mapped these to `alive`
   * and put dead domains at the top of the ready queue.
   */
  it('drops the domains a crawl reports as dead', () => {
    const rows = parseSeedFile([
      { domain: 'alive.example', status: 'alive' },
      { domain: 'gone.example', status: 'dead' },
      { domain: 'walled.example', status: 'blocked' },
    ])
    expect(rows.map((r) => r.domain)).toEqual(['alive.example', 'walled.example'])
  })

  it('keeps a row whose status the crawl never set', () => {
    const rows = parseSeedFile([{ domain: 'unknown.example' }])
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('alive')
  })
})

describeCrawl('the real crawl file', () => {
  it('keeps the 237 reachable domains and flattens the requires object', () => {
    const rows = crawlFile()
    // 251 in the file, minus the 14 it reports as dead.
    expect(rows).toHaveLength(237)
    expect(rows.filter((r) => r.status === 'alive')).toHaveLength(217)
    expect(rows.filter((r) => r.status === 'blocked')).toHaveLength(20)
    // One of the 14 dead rows carried a submit URL, so this drops with them.
    expect(rows.filter((r) => r.submitUrl)).toHaveLength(155)
    expect(rows.filter((r) => r.requiresCaptcha)).toHaveLength(31)
    expect(rows.filter((r) => r.requiresAccount)).toHaveLength(68)
    expect(rows.filter((r) => r.requiresPayment)).toHaveLength(28)
    expect(rows.filter((r) => r.tier === 'a')).toHaveLength(33)
  })

})

describe('seeding a crawled source', () => {
  const rows = CRAWLED

  it('is idempotent: a second run inserts nothing and changes nothing', () => {
    const first = upsertDirectories(harness.db, SOURCE_CRAWL, rows, { crawled: true })
    expect(first.inserted).toBe(rows.length)

    const second = upsertDirectories(harness.db, SOURCE_CRAWL, rows, { crawled: true })
    expect(second.inserted).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.unchanged).toBe(rows.length)

    expect(harness.db.select().from(directories).all()).toHaveLength(rows.length)
  })

  it('never overwrites my curation on a re-run', () => {
    upsertDirectories(harness.db, SOURCE_CRAWL, rows, { crawled: true })

    const curated = rows.find((r) => r.tier === 'a')!.domain
    harness.db
      .update(directories)
      .set({
        tier: 'c',
        categories: JSON.stringify(['analytics']),
        price: 49,
        notes: 'my note',
      })
      .where(eq(directories.domain, curated))
      .run()

    upsertDirectories(harness.db, SOURCE_CRAWL, rows, { crawled: true })

    const [after] = harness.db.select().from(directories).where(eq(directories.domain, curated)).all()
    expect(after.tier).toBe('c')
    expect(after.categories).toBe(JSON.stringify(['analytics']))
    expect(after.price).toBe(49)
    expect(after.notes).toBe('my note')
  })

  it('does not delete a submitUrl found later when the crawl found none', () => {
    upsertDirectories(harness.db, SOURCE_CRAWL, rows, { crawled: true })

    const blind = rows.find((r) => !r.submitUrl)!.domain
    harness.db
      .update(directories)
      .set({ submitUrl: 'https://example.com/submit', lastCheckedAt: '2026-08-17' })
      .where(eq(directories.domain, blind))
      .run()

    upsertDirectories(harness.db, SOURCE_CRAWL, rows, { crawled: true })

    const [after] = harness.db.select().from(directories).where(eq(directories.domain, blind)).all()
    expect(after.submitUrl).toBe('https://example.com/submit')
  })
})


describe('normalizeDomain', () => {
  it('strips protocol, www, path, port and case', () => {
    expect(normalizeDomain('https://WWW.SaaSHub.com:443/submit?x=1#a')).toBe('saashub.com')
    expect(normalizeDomain('http://saashub.com/')).toBe('saashub.com')
    expect(normalizeDomain('  saashub.com. ')).toBe('saashub.com')
  })

  it('rejects things that are not domains', () => {
    expect(normalizeDomain('localhost')).toBeNull()
    expect(normalizeDomain('some words here')).toBeNull()
    expect(normalizeDomain('')).toBeNull()
    expect(normalizeDomain(null)).toBeNull()
  })
})
