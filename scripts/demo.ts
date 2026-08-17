import { eq, sql } from 'drizzle-orm'

import { openDb, DB_PATH } from '../db/connect'
import { logEvent } from '../db/events'
import { directories, products, submissions, type SubmissionState } from '../db/schema'

/**
 * Fills a database with a campaign in progress, for screenshots and for seeing
 * the app populated before you have sent anything.
 *
 * Refuses to touch the default file. Point SUBMITDOCK_DB somewhere disposable:
 *
 *   SUBMITDOCK_DB=/tmp/demo.db npm run db:migrate
 *   SUBMITDOCK_DB=/tmp/demo.db npm run import
 *   SUBMITDOCK_DB=/tmp/demo.db npm run demo
 *
 * The product is invented. The directories are real, because they are the real
 * catalog, but every outcome here is made up, so nothing says anything about a
 * named site beyond "this listing is live", which is the ordinary case.
 */
if (!process.env.SUBMITDOCK_DB) {
  console.error('refusing to write demo data into the default database.')
  console.error('run it with SUBMITDOCK_DB=/tmp/demo.db so your own campaign is untouched.')
  process.exit(1)
}

const DEMO_PRODUCT = {
  slug: 'northwind',
  name: 'Northwind',
  tagline: 'Uptime monitoring that pages a person, not a channel',
  url: 'https://northwind.dev',
  contactEmail: 'hello@northwind.dev',
  descriptionShort: 'Uptime monitoring that pages a person, not a channel',
  descriptionMedium:
    'Checks your endpoints from six regions and escalates to whoever is actually on call, by phone, until somebody acknowledges. No channel to ignore at 3am.',
  descriptionLong:
    'Northwind watches your endpoints from six regions and tells one person when something breaks. An alert escalates by phone until it is acknowledged, so an outage cannot sit unread in a channel overnight. Status pages, maintenance windows and SLA reports come with it. Free for three monitors.',
  categories: JSON.stringify(['devops', 'monitoring', 'saas', 'developer-tools']),
  logoOnLight: '',
  logoOnDark: '',
  iconOnLight: '',
  iconOnDark: '',
  screenshots: JSON.stringify([]),
  pricing: 'Free for 3 monitors, then $12 a month',
  x: 'northwinddev',
  github: '',
}

/** domain, state, days since sent, listing?, verdict */
type Row = [string, SubmissionState, number, string | null, 'dofollow' | 'nofollow' | 'none' | null]

const ROWS: Row[] = [
  ['producthunt.com', 'live', 34, 'https://www.producthunt.com/products/northwind', 'dofollow'],
  ['saashub.com', 'live', 31, 'https://www.saashub.com/northwind', 'dofollow'],
  ['alternativeto.net', 'live', 29, 'https://alternativeto.net/software/northwind/', 'nofollow'],
  ['betalist.com', 'live', 27, 'https://betalist.com/startups/northwind', 'dofollow'],
  ['indiehackers.com', 'live', 25, 'https://www.indiehackers.com/product/northwind', 'nofollow'],
  ['saasworthy.com', 'live', 24, 'https://www.saasworthy.com/product/northwind', 'dofollow'],
  ['startupstash.com', 'live', 22, 'https://startupstash.com/northwind/', 'dofollow'],
  ['softwareworld.co', 'live', 21, 'https://www.softwareworld.co/tool/northwind/', 'nofollow'],
  ['devpost.com', 'live', 19, 'https://devpost.com/software/northwind', 'dofollow'],
  ['f6s.com', 'live', 18, 'https://www.f6s.com/northwind', 'dofollow'],
  ['crozdesk.com', 'live', 16, 'https://crozdesk.com/software/northwind', 'none'],
  ['findly.tools', 'live', 15, 'https://findly.tools/northwind', 'dofollow'],
  ['futuretools.io', 'submitted', 12, 'https://www.futuretools.io/tools/northwind', null],
  ['dang.ai', 'submitted', 11, null, null],
  ['toolpilot.ai', 'submitted', 9, null, null],
  ['aitoolhunt.com', 'submitted', 8, null, null],
  ['sourceforge.net', 'submitted', 6, null, null],
  ['g2.com', 'submitted', 5, null, null],
  ['capterra.com', 'submitted', 4, null, null],
  ['gartner.com', 'submitted', 3, null, null],
  ['angel.co', 'submitted', 2, null, null],
  ['techinasia.com', 'rejected', 20, null, null],
  ['springwise.com', 'rejected', 17, null, null],
  ['theresanaiforthat.com', 'skipped', 0, null, null],
  ['aixploria.com', 'skipped', 0, null, null],
  ['dailytoolz.com', 'skipped', 0, null, null],
]

const NOTES: Record<string, string> = {
  'techinasia.com': 'Editorial pick only, not an open directory. Nothing to submit.',
  'springwise.com': 'They only cover launches in their own themes. Not a fit this quarter.',
  'theresanaiforthat.com': 'Paid listing. Revisit once there is budget for it.',
  'aixploria.com': 'Paid listing, and the DR does not justify it yet.',
  'dailytoolz.com': 'Wants a reciprocal link in the footer. Not doing that.',
  'crozdesk.com': 'Listing is up but the profile links out with a redirect, not a plain link.',
}

const db = openDb()
const iso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

db.delete(submissions).run()
db.insert(products).values(DEMO_PRODUCT).onConflictDoUpdate({
  target: products.slug,
  set: DEMO_PRODUCT,
}).run()

let inserted = 0
let missing = 0

for (const [domain, state, days, listingUrl, verdict] of ROWS) {
  const [exists] = db.select().from(directories).where(eq(directories.domain, domain)).limit(1).all()
  if (!exists) {
    missing += 1
    continue
  }

  const verified = verdict !== null
  db.insert(submissions)
    .values({
      productSlug: DEMO_PRODUCT.slug,
      domain,
      state,
      submittedAt: state === 'skipped' ? null : iso(days),
      listingUrl,
      backlinkLive: verified ? verdict !== 'none' : null,
      backlinkRel: verified && verdict !== 'none' ? verdict : null,
      lastVerifiedAt: verified ? iso(1) : null,
      notes: NOTES[domain] ?? null,
    })
    .run()
  inserted += 1

  // What a directory hands out is catalog knowledge, so verify writes it there.
  if (verdict === 'dofollow' || verdict === 'nofollow') {
    db.update(directories).set({ linkRel: verdict }).where(eq(directories.domain, domain)).run()
  }

  if (verified) {
    logEvent(db, {
      action: verdict === 'none' ? 'verify.backlink_missing' : 'verify.backlink_live',
      productSlug: DEMO_PRODUCT.slug,
      domain,
      ok: verdict !== 'none',
      detail: { listingUrl, rel: verdict === 'none' ? null : verdict },
    })
  }
}

logEvent(db, {
  action: 'verify.done',
  productSlug: DEMO_PRODUCT.slug,
  detail: { checked: ROWS.filter((r) => r[4] !== null).length },
})

const [{ total }] = db.select({ total: sql<number>`count(*)` }).from(directories).all()

console.log(`demo campaign written to ${DB_PATH}`)
console.log(`  ${inserted} submissions across ${total} directories`)
if (missing > 0) console.log(`  ${missing} skipped, not in this catalog`)
