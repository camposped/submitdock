import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

/** Curation grade: how much a link from this directory is actually worth. */
export const TIERS = ['a', 'b', 'c'] as const
export type Tier = (typeof TIERS)[number]

export const DIRECTORY_STATUSES = ['alive', 'blocked'] as const
export type DirectoryStatus = (typeof DIRECTORY_STATUSES)[number]

export const CAPTCHA_VENDORS = ['recaptcha', 'turnstile', 'hcaptcha'] as const
export type CaptchaVendor = (typeof CAPTCHA_VENDORS)[number]

export const SUBMISSION_STATES = [
  'todo',
  'skipped',
  'submitted',
  'verified',
  'live',
  'rejected',
] as const
export type SubmissionState = (typeof SUBMISSION_STATES)[number]

export const BACKLINK_RELS = ['dofollow', 'nofollow'] as const
export type BacklinkRel = (typeof BACKLINK_RELS)[number]

export const ACTORS = ['agent', 'human'] as const
export type Actor = (typeof ACTORS)[number]

/**
 * The shared catalog. One row per domain, forever, across every product.
 * This is the asset: the robot is disposable, this table is not.
 *
 * `domain` is the primary key on purpose, so an upsert from any source
 * converges instead of duplicating.
 */
/**
 * A named list of directories somebody publishes or curates.
 *
 * There is no consensus on where a product should be submitted: every list is
 * one person's opinion, they overlap heavily, and they disagree at the edges.
 * So a catalog is a *membership*, not a copy. The facts about a domain, its
 * form, its blockers, its authority, the link type it hands out, live once on
 * `directories` and are shared by every list that names it. Two catalogs
 * carrying producthunt.com must not each hold their own answer to "does this
 * one give dofollow".
 */
export const catalogs = sqliteTable('catalogs', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  /** One line: whose list this is and what it is good for. */
  description: text('description').notNull().default(''),
  /** Where it came from, when there is a public URL to point at. */
  sourceUrl: text('source_url'),
  addedAt: text('added_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

/**
 * Which domains a catalog names. The join is the catalog: everything else
 * about the domain belongs to `directories`.
 */
export const catalogDomains = sqliteTable(
  'catalog_domains',
  {
    catalogSlug: text('catalog_slug')
      .notNull()
      .references(() => catalogs.slug, { onDelete: 'cascade' }),
    domain: text('domain')
      .notNull()
      .references(() => directories.domain, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.catalogSlug, t.domain] }),
    index('catalog_domains_domain_idx').on(t.domain),
  ],
)

export type Catalog = typeof catalogs.$inferSelect
export type NewCatalog = typeof catalogs.$inferInsert

export const directories = sqliteTable(
  'directories',
  {
    domain: text('domain').primaryKey(),
    name: text('name'),
    submitUrl: text('submit_url'),
    tier: text('tier').$type<Tier>(),
    /**
     * Semrush Authority Score, 0 to 100. Third party authority, objective,
     * unlike `tier`, which is my own opinion of the same thing.
     *
     * It replaced Ahrefs Domain Rating, and the two are not interchangeable:
     * the same domain reads 89 as DR and 54 as AS, and the gap is not a
     * constant. One column, one source, so a sort compares like with like.
     * Null means Semrush has no data for the domain, which is not the same as
     * scoring it zero.
     */
    authorityScore: integer('authority_score'),
    /**
     * What kind of link this directory hands out, learned from verify.ts across
     * every product. This is catalog knowledge and the reason it lives here
     * rather than on a submission: "saashub gives dofollow" is worth carrying
     * to the next product, and a nofollow directory is worth less time.
     */
    linkRel: text('link_rel').$type<BacklinkRel>(),
    /** JSON array of strings. */
    categories: text('categories').notNull().default('[]'),
    requiresAccount: integer('requires_account', { mode: 'boolean' })
      .notNull()
      .default(false),
    requiresCaptcha: integer('requires_captcha', { mode: 'boolean' })
      .notNull()
      .default(false),
    requiresPayment: integer('requires_payment', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** Wants a reciprocal link back before it approves the listing. */
    requiresBacklink: integer('requires_backlink', { mode: 'boolean' })
      .notNull()
      .default(false),
    captchaVendor: text('captcha_vendor').$type<CaptchaVendor>(),
    /** Tally, Google Forms, Typeform, Airtable. */
    thirdPartyForm: integer('third_party_form', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** USD, only meaningful when requiresPayment. */
    price: real('price'),
    status: text('status').$type<DirectoryStatus>().notNull().default('alive'),
    httpStatus: integer('http_status').notNull().default(0),
    /**
     * Where this domain came from. Comma separated when a domain shows up in
     * more than one source, because provenance decides who to trust later.
     */
    source: text('source').notNull(),
    /** ISO date. */
    lastCheckedAt: text('last_checked_at').notNull(),
    notes: text('notes'),
  },
  (t) => [
    index('directories_status_idx').on(t.status),
    index('directories_tier_idx').on(t.tier),
    index('directories_source_idx').on(t.source),
  ],
)

/** One row per product of mine. The kit of assets a submission is filled from. */
export const products = sqliteTable('products', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull().default(''),
  url: text('url').notNull().default(''),
  contactEmail: text('contact_email').notNull().default(''),
  /** ~60 chars. */
  descriptionShort: text('description_short').notNull().default(''),
  /** ~160 chars. */
  descriptionMedium: text('description_medium').notNull().default(''),
  /** ~500 chars. */
  descriptionLong: text('description_long').notNull().default(''),
  /** JSON array of strings. */
  categories: text('categories').notNull().default('[]'),
  /**
   * Four pieces of brand art, named for the background they go ON, not for
   * the colour of their ink. "The light one" is the question every one of
   * these gets asked wrong, so the column answers it: `logoOnDark` is the
   * artwork you upload when the directory's page is dark.
   */
  logoOnLight: text('logo_on_light').notNull().default(''),
  logoOnDark: text('logo_on_dark').notNull().default(''),
  /** Square, for the many forms that ask for an app icon or an avatar. */
  iconOnLight: text('icon_on_light').notNull().default(''),
  iconOnDark: text('icon_on_dark').notNull().default(''),
  /** JSON array of strings. */
  screenshots: text('screenshots').notNull().default('[]'),
  pricing: text('pricing').notNull().default(''),
  /*
   * Social profiles, stored as the handle rather than the URL.
   *
   * Directory forms are split roughly down the middle on which one they want,
   * and a handle is the half you cannot derive the other way: "kometrics" gives
   * you every URL, while a URL has to be parsed back and each network spells
   * its path differently. So the field normalises whatever gets pasted into a
   * handle, and `lib/social.ts` builds the URL when a form wants one.
   */
  x: text('x').notNull().default(''),
  github: text('github').notNull().default(''),
  youtube: text('youtube').notNull().default(''),
  instagram: text('instagram').notNull().default(''),
  facebook: text('facebook').notNull().default(''),
  linkedin: text('linkedin').notNull().default(''),
})

/**
 * The crossing of product x directory. This is where campaign state lives,
 * so the same catalog serves one product today and the next one tomorrow.
 */
export const submissions = sqliteTable(
  'submissions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productSlug: text('product_slug')
      .notNull()
      .references(() => products.slug, { onDelete: 'cascade' }),
    domain: text('domain')
      .notNull()
      .references(() => directories.domain, { onDelete: 'cascade' }),
    state: text('state').$type<SubmissionState>().notNull().default('todo'),
    submittedAt: text('submitted_at'),
    listingUrl: text('listing_url'),
    backlinkLive: integer('backlink_live', { mode: 'boolean' }),
    backlinkRel: text('backlink_rel').$type<BacklinkRel>(),
    lastVerifiedAt: text('last_verified_at'),
    notes: text('notes'),
    /**
     * The clock on one attempt, measured rather than reported.
     *
     * `attemptStartedAt` is stamped when the agent says it is starting this
     * directory and cleared when it finishes, so `durationMs` is arithmetic
     * the tool does. Asking the agent how long it took would be asking it to
     * invent a number, which is the one thing AGENTS.md forbids.
     *
     * A non-null `attemptStartedAt` also means an attempt is in flight, which
     * is how a row can show as being worked on right now.
     */
    attemptStartedAt: text('attempt_started_at'),
    durationMs: integer('duration_ms'),
    /**
     * The final state of the page, as a picture. Absolute path, same as the
     * product's brand slots: what the agent saw is worth more than what it
     * says it saw, and a "thanks for submitting" screen is the only proof a
     * directory ever gives you.
     */
    screenshotPath: text('screenshot_path'),
  },
  (t) => [
    uniqueIndex('submissions_product_domain_idx').on(t.productSlug, t.domain),
    index('submissions_state_idx').on(t.state),
  ],
)

/**
 * The agent's trail. Showing what was done is a requirement, not decoration,
 * so every script write of consequence lands a row here.
 */
export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    at: text('at')
      .notNull()
      .default(sql`(datetime('now'))`),
    actor: text('actor').$type<Actor>().notNull().default('agent'),
    action: text('action').notNull(),
    productSlug: text('product_slug'),
    domain: text('domain'),
    /** JSON object. */
    detail: text('detail').notNull().default('{}'),
    ok: integer('ok', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => [index('events_at_idx').on(t.at), index('events_action_idx').on(t.action)],
)

/**
 * What the agent is doing right now.
 *
 * The events table says what already happened; this one says what is still in
 * flight, which is the difference between "nothing is running" and "a run
 * crashed halfway". An open row is one with no finishedAt. The agent opens one
 * before a batch of work and closes it after, so the sidebar can show a
 * spinner that means something rather than guessing from event timestamps.
 */
export const runs = sqliteTable(
  'runs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** One line, written for a person: "Submitting Northwind to 12 directories". */
    label: text('label').notNull(),
    /** The step inside the run, updated as it goes. */
    step: text('step'),
    /** Optional progress, both null when the work is not countable. */
    done: integer('done'),
    total: integer('total'),
    startedAt: text('started_at').notNull(),
    /** Null while the run is open. */
    finishedAt: text('finished_at'),
    ok: integer('ok', { mode: 'boolean' }),
    productSlug: text('product_slug'),
  },
  (t) => [index('runs_started_idx').on(t.startedAt)],
)

export type Run = typeof runs.$inferSelect
export type NewRun = typeof runs.$inferInsert

export type Directory = typeof directories.$inferSelect
export type NewDirectory = typeof directories.$inferInsert
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type Submission = typeof submissions.$inferSelect
export type NewSubmission = typeof submissions.$inferInsert
export type EventRow = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
