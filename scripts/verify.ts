import { and, eq, isNotNull, ne } from 'drizzle-orm'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { directories, products, submissions } from '../db/schema'
import { fetchPage, mapLimit } from '../lib/fetching'
import { findBacklink } from '../lib/verify'

const CONCURRENCY = 10
const TIMEOUT_MS = 15_000

/** `npm run verify -- northwind` narrows it to one product. */
const productFilter = process.argv[2] ?? null

async function main() {
  const db = openDb()

  const rows = db
    .select({
      id: submissions.id,
      productSlug: submissions.productSlug,
      domain: submissions.domain,
      state: submissions.state,
      listingUrl: submissions.listingUrl,
      productUrl: products.url,
    })
    .from(submissions)
    .innerJoin(products, eq(products.slug, submissions.productSlug))
    .where(
      and(
        isNotNull(submissions.listingUrl),
        ne(submissions.listingUrl, ''),
        productFilter ? eq(submissions.productSlug, productFilter) : undefined,
      ),
    )
    .all()

  if (rows.length === 0) {
    console.log('nothing to verify: no submission has a listingUrl yet')
    return
  }

  console.log(`verifying ${rows.length} listing pages, ${CONCURRENCY} at a time`)

  let live = 0
  let dofollow = 0
  let missing = 0
  let unreachable = 0

  await mapLimit(rows, CONCURRENCY, async (row) => {
    const listingUrl = row.listingUrl as string
    const page = await fetchPage(listingUrl, TIMEOUT_MS)
    const now = new Date().toISOString()

    if (!page.ok || !page.html) {
      unreachable += 1
      // The page could not be read, so the previous verdict is left alone
      // rather than being downgraded by a network hiccup.
      db.update(submissions).set({ lastVerifiedAt: now }).where(eq(submissions.id, row.id)).run()
      logEvent(db, {
        action: 'verify.unreachable',
        productSlug: row.productSlug,
        domain: row.domain,
        ok: false,
        detail: { listingUrl, status: page.status, error: page.error },
      })
      console.log(`  ?  ${row.domain.padEnd(30)} ${page.status || page.error}`)
      return
    }

    const result = findBacklink(page.html, row.productUrl, page.url)

    db.update(submissions)
      .set({
        backlinkLive: result.live,
        backlinkRel: result.rel,
        lastVerifiedAt: now,
        // A confirmed link is the strongest state there is, so it promotes the
        // row. A missing one does not demote: the listing may still be queued
        // for review, which is `submitted`, not `rejected`.
        ...(result.live ? { state: 'live' as const } : {}),
      })
      .where(eq(submissions.id, row.id))
      .run()

    if (result.live) {
      live += 1
      if (result.rel === 'dofollow') dofollow += 1

      // What a directory hands out belongs to the catalog, not to one product:
      // "saashub gives dofollow" is worth carrying to the next product, and a
      // nofollow directory is worth less of my time everywhere.
      db.update(directories)
        .set({ linkRel: result.rel })
        .where(eq(directories.domain, row.domain))
        .run()
    } else {
      missing += 1
    }

    logEvent(db, {
      action: result.live ? 'verify.backlink_live' : 'verify.backlink_missing',
      productSlug: row.productSlug,
      domain: row.domain,
      ok: result.live,
      detail: {
        listingUrl,
        finalUrl: page.url,
        rel: result.rel,
        pageNofollow: result.pageNofollow,
        hrefs: result.matches.slice(0, 3).map((m) => m.href),
      },
    })

    const mark = result.live ? (result.rel === 'dofollow' ? '✓' : '~') : '✗'
    console.log(`  ${mark}  ${row.domain.padEnd(30)} ${result.rel ?? 'no link found'}`)
  })

  console.log('')
  console.log(`  live ${live}  (dofollow ${dofollow}, nofollow ${live - dofollow})`)
  console.log(`  missing ${missing}  unreachable ${unreachable}`)

  logEvent(db, {
    action: 'verify.done',
    productSlug: productFilter,
    detail: { checked: rows.length, live, dofollow, missing, unreachable },
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
