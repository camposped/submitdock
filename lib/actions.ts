'use server'

import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { cookies } from 'next/headers'
import { refresh } from 'next/cache'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { logEvent } from '@/db/events'
import { isSingleAssetField, type AssetField } from '@/lib/asset-fields'
import { ALLOWED_EXTENSIONS, ASSET_DIR, isInsideAssetDir, safeFileName } from '@/lib/assets'
import { parseJsonArray } from '@/lib/domain'
import {
  BACKLINK_RELS,
  SUBMISSION_STATES,
  TIERS,
  directories,
  products,
  submissions,
  type BacklinkRel,
  type SubmissionState,
  type Tier,
} from '@/db/schema'
import { PRODUCT_COOKIE } from '@/lib/product-selection'

export async function selectProduct(slug: string) {
  const store = await cookies()
  store.set(PRODUCT_COOKIE, slug, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  refresh()
}

// -- Catalog -----------------------------------------------------------------

type DirectoryPatch = {
  tier?: string | null
  categories?: string[]
  price?: number | null
  notes?: string | null
}

/** Inline edits from the catalog table. Only my four curated columns. */
export async function updateDirectory(domain: string, patch: DirectoryPatch) {
  const values: Record<string, unknown> = {}

  if ('tier' in patch) {
    values.tier = patch.tier && (TIERS as readonly string[]).includes(patch.tier) ? patch.tier : null
  }
  if ('categories' in patch) values.categories = JSON.stringify(patch.categories ?? [])
  if ('price' in patch) {
    values.price = typeof patch.price === 'number' && Number.isFinite(patch.price) ? patch.price : null
  }
  if ('notes' in patch) values.notes = patch.notes?.trim() ? patch.notes.trim() : null

  if (Object.keys(values).length === 0) return

  db.update(directories).set(values).where(eq(directories.domain, domain)).run()
  logEvent(db, { action: 'directory.edited', actor: 'human', domain, detail: values })
  refresh()
}

// -- Submissions -------------------------------------------------------------

/** Rows are created on first touch, so 367 x N empty rows never exist. */
function ensureSubmission(productSlug: string, domain: string) {
  const [existing] = db
    .select()
    .from(submissions)
    .where(and(eq(submissions.productSlug, productSlug), eq(submissions.domain, domain)))
    .limit(1)
    .all()
  if (existing) return existing

  db.insert(submissions).values({ productSlug, domain, state: 'todo' }).run()
  const [created] = db
    .select()
    .from(submissions)
    .where(and(eq(submissions.productSlug, productSlug), eq(submissions.domain, domain)))
    .limit(1)
    .all()
  return created
}

export async function setSubmissionState(productSlug: string, domain: string, state: string) {
  if (!(SUBMISSION_STATES as readonly string[]).includes(state)) return
  const next = state as SubmissionState

  const current = ensureSubmission(productSlug, domain)
  if (current.state === next) return

  db.update(submissions)
    .set({
      state: next,
      // Stamping the moment it was sent is what makes "submitted three weeks
      // ago and still not live" a visible fact rather than a memory.
      submittedAt:
        next === 'submitted' && !current.submittedAt ? new Date().toISOString() : current.submittedAt,
    })
    .where(eq(submissions.id, current.id))
    .run()

  logEvent(db, {
    action: 'submission.state',
    actor: 'human',
    productSlug,
    domain,
    detail: { from: current.state, to: next },
  })
  refresh()
}

export async function setListingUrl(productSlug: string, domain: string, listingUrl: string) {
  const current = ensureSubmission(productSlug, domain)
  const value = listingUrl.trim() || null
  if (current.listingUrl === value) return

  db.update(submissions)
    .set({
      listingUrl: value,
      // A new listing URL invalidates whatever the last check concluded.
      backlinkLive: null,
      backlinkRel: null,
      lastVerifiedAt: null,
    })
    .where(eq(submissions.id, current.id))
    .run()

  logEvent(db, {
    action: 'submission.listing_url',
    actor: 'human',
    productSlug,
    domain,
    detail: { listingUrl: value },
  })
  refresh()
}

export async function setSubmissionNotes(productSlug: string, domain: string, notes: string) {
  const current = ensureSubmission(productSlug, domain)
  const value = notes.trim() || null
  if (current.notes === value) return

  db.update(submissions).set({ notes: value }).where(eq(submissions.id, current.id)).run()
  logEvent(db, {
    action: 'submission.notes',
    actor: 'human',
    productSlug,
    domain,
    detail: { notes: value },
  })
  refresh()
}

/**
 * Recorded by hand when a directory is checked without running verify.ts, so
 * the panel's confirmed count stays honest either way.
 */
export async function setBacklink(
  productSlug: string,
  domain: string,
  live: boolean | null,
  rel: string | null,
) {
  const current = ensureSubmission(productSlug, domain)
  const backlinkRel =
    rel && (BACKLINK_RELS as readonly string[]).includes(rel) ? (rel as BacklinkRel) : null

  db.update(submissions)
    .set({
      backlinkLive: live,
      backlinkRel: live ? backlinkRel : null,
      lastVerifiedAt: new Date().toISOString(),
      ...(live ? { state: 'live' as const } : {}),
    })
    .where(eq(submissions.id, current.id))
    .run()

  logEvent(db, {
    action: 'submission.backlink',
    actor: 'human',
    productSlug,
    domain,
    ok: Boolean(live),
    detail: { live, rel: backlinkRel },
  })
  refresh()
}

/**
 * The catalog sheet's Save. One action rather than four, because the sheet
 * edits two tables at once: the shared catalog row and this product's
 * submission. A missing productSlug just skips the second half.
 */
export async function saveDirectorySheet(
  domain: string,
  productSlug: string | null,
  formData: FormData,
) {
  const text = (key: string) => {
    const raw = formData.get(key)
    return typeof raw === 'string' ? raw.trim() : ''
  }

  const tier = text('tier')
  const price = Number.parseFloat(text('price').replace(/[^0-9.]/g, ''))

  db.update(directories)
    .set({
      tier: (TIERS as readonly string[]).includes(tier) ? (tier as Tier) : null,
      categories: JSON.stringify(
        text('categories')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
      price: Number.isFinite(price) ? price : null,
      notes: text('notes') || null,
    })
    .where(eq(directories.domain, domain))
    .run()

  logEvent(db, {
    action: 'directory.edited',
    actor: 'human',
    domain,
    detail: { tier: tier || null, price: Number.isFinite(price) ? price : null },
  })

  if (productSlug) {
    const current = ensureSubmission(productSlug, domain)
    const state = text('state')
    const nextState = (SUBMISSION_STATES as readonly string[]).includes(state)
      ? (state as SubmissionState)
      : current.state
    const listingUrl = text('listingUrl') || null
    const listingChanged = listingUrl !== current.listingUrl

    db.update(submissions)
      .set({
        state: nextState,
        listingUrl,
        notes: text('submissionNotes') || null,
        submittedAt:
          nextState === 'submitted' && !current.submittedAt
            ? new Date().toISOString()
            : current.submittedAt,
        // A new listing URL invalidates whatever the last check concluded.
        ...(listingChanged
          ? { backlinkLive: null, backlinkRel: null, lastVerifiedAt: null }
          : {}),
      })
      .where(eq(submissions.id, current.id))
      .run()

    if (nextState !== current.state || listingChanged) {
      logEvent(db, {
        action: 'submission.edited',
        actor: 'human',
        productSlug,
        domain,
        detail: { from: current.state, to: nextState, listingUrl },
      })
    }
  }

  refresh()
}

// -- Product -----------------------------------------------------------------

/**
 * The text half of the kit. `logo` and `screenshots` are deliberately absent:
 * they are files now, owned by the asset actions and saved the moment they are
 * picked. Leaving them here would let a form that does not carry them blank
 * them out on save.
 */
const PRODUCT_TEXT_FIELDS = [
  'name',
  'tagline',
  'url',
  'contactEmail',
  'descriptionShort',
  'descriptionMedium',
  'descriptionLong',
  'pricing',
  'x',
  'github',
] as const

export async function updateProduct(slug: string, formData: FormData) {
  const values: Record<string, string> = {}
  for (const field of PRODUCT_TEXT_FIELDS) {
    const raw = formData.get(field)
    if (typeof raw === 'string') values[field] = raw.trim()
  }

  const listToJson = (raw: FormDataEntryValue | null) =>
    JSON.stringify(
      typeof raw === 'string'
        ? raw
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    )

  const patch = {
    ...values,
    categories: listToJson(formData.get('categories')),
  }

  db.update(products).set(patch).where(eq(products.slug, slug)).run()
  logEvent(db, {
    action: 'product.edited',
    actor: 'human',
    productSlug: slug,
    detail: { fields: Object.keys(patch) },
  })
  refresh()
}

// -- Product assets ----------------------------------------------------------

function productRow(slug: string) {
  const [row] = db.select().from(products).where(eq(products.slug, slug)).limit(1).all()
  return row ?? null
}

/**
 * Writes an uploaded image to disk and registers its absolute path.
 *
 * A data URL in the database would be the smaller change, but it would not do
 * the job: a directory form asks you to upload a FILE, so what the kit has to
 * hand over is a real path to paste into the macOS open dialog.
 */
export async function uploadProductAsset(slug: string, field: AssetField, formData: FormData) {
  const files = formData.getAll('file').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return { error: 'Pick an image first.' }

  const product = productRow(slug)
  if (!product) return { error: 'That product no longer exists.' }

  const dir = path.join(ASSET_DIR, slug)
  await mkdir(dir, { recursive: true })

  const written: string[] = []
  for (const file of files) {
    const extension = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) continue

    // Collisions are resolved rather than overwritten: two screenshots called
    // dashboard.webp from different folders are two different pictures.
    const base = safeFileName(file.name)
    let target = path.join(dir, base)
    let counter = 2
    while (existsSync(target)) {
      const stem = base.slice(0, base.length - extension.length)
      target = path.join(dir, `${stem}-${counter}${extension}`)
      counter += 1
    }

    await writeFile(target, Buffer.from(await file.arrayBuffer()))
    written.push(target)
  }

  if (written.length === 0) {
    return { error: `Use one of ${ALLOWED_EXTENSIONS.join(', ')}.` }
  }

  if (isSingleAssetField(field)) {
    db.update(products).set({ [field]: written[0] }).where(eq(products.slug, slug)).run()
  } else {
    const next = [...parseJsonArray(product.screenshots), ...written]
    db.update(products).set({ screenshots: JSON.stringify(next) }).where(eq(products.slug, slug)).run()
  }

  logEvent(db, {
    action: 'product.asset_added',
    actor: 'human',
    productSlug: slug,
    detail: { field, files: written.map((f) => path.basename(f)) },
  })
  refresh()
  return { ok: true }
}

/**
 * Unregisters an asset, and deletes the file only if this app put it there.
 *
 * A path under data/assets is a copy we made and nobody else refers to, so
 * leaving it would just grow orphans. Anything else is a file of yours that
 * happens to be registered here, and removing it from the kit is not
 * permission to delete it off your disk.
 */
export async function removeProductAsset(slug: string, field: AssetField, assetPath: string) {
  const product = productRow(slug)
  if (!product) return

  if (isSingleAssetField(field)) {
    db.update(products).set({ [field]: '' }).where(eq(products.slug, slug)).run()
  } else {
    const next = parseJsonArray(product.screenshots).filter((shot) => shot !== assetPath)
    db.update(products).set({ screenshots: JSON.stringify(next) }).where(eq(products.slug, slug)).run()
  }

  const owned = isInsideAssetDir(assetPath)
  if (owned && existsSync(assetPath)) {
    await rm(assetPath, { force: true })
  }

  logEvent(db, {
    action: 'product.asset_removed',
    actor: 'human',
    productSlug: slug,
    detail: { field, file: path.basename(assetPath), fileDeleted: owned },
  })
  refresh()
}

/** Registers a file already on disk, which is how the existing kit was built. */
export async function linkProductAsset(slug: string, field: AssetField, rawPath: string) {
  const assetPath = rawPath.trim()
  if (!assetPath) return { error: 'Paste a path first.' }
  if (!path.isAbsolute(assetPath)) return { error: 'Use an absolute path.' }
  if (!ALLOWED_EXTENSIONS.includes(path.extname(assetPath).toLowerCase())) {
    return { error: `Use one of ${ALLOWED_EXTENSIONS.join(', ')}.` }
  }
  if (!existsSync(assetPath)) return { error: 'Nothing is at that path.' }

  const product = productRow(slug)
  if (!product) return { error: 'That product no longer exists.' }

  if (isSingleAssetField(field)) {
    db.update(products).set({ [field]: assetPath }).where(eq(products.slug, slug)).run()
  } else {
    const current = parseJsonArray(product.screenshots)
    if (current.includes(assetPath)) return { error: 'That one is already here.' }
    db.update(products)
      .set({ screenshots: JSON.stringify([...current, assetPath]) })
      .where(eq(products.slug, slug))
      .run()
  }

  logEvent(db, {
    action: 'product.asset_linked',
    actor: 'human',
    productSlug: slug,
    detail: { field, path: assetPath },
  })
  refresh()
  return { ok: true }
}

/** Screenshot order is the order directories see them, so it is worth setting. */
export async function moveProductScreenshot(slug: string, assetPath: string, direction: -1 | 1) {
  const product = productRow(slug)
  if (!product) return

  const shots = parseJsonArray(product.screenshots)
  const from = shots.indexOf(assetPath)
  const to = from + direction
  if (from === -1 || to < 0 || to >= shots.length) return

  ;[shots[from], shots[to]] = [shots[to], shots[from]]
  db.update(products).set({ screenshots: JSON.stringify(shots) }).where(eq(products.slug, slug)).run()
  refresh()
}

export async function createProduct(formData: FormData) {
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) return

  const name = String(formData.get('name') ?? '').trim() || slug

  db.insert(products).values({ slug, name }).onConflictDoNothing().run()
  logEvent(db, { action: 'product.created', actor: 'human', productSlug: slug, detail: { name } })

  const store = await cookies()
  store.set(PRODUCT_COOKIE, slug, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  refresh()
}
