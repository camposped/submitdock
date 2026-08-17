import 'server-only'

import path from 'node:path'

import { db } from '@/db'
import { products } from '@/db/schema'
import { parseJsonArray } from '@/lib/domain'

/** Where uploads land. Outside public/ so Next never tries to serve them raw. */
export const ASSET_DIR = path.join(process.cwd(), 'data', 'assets')

const CONTENT_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
}

export const ALLOWED_EXTENSIONS = Object.keys(CONTENT_TYPES)

export function contentTypeFor(filePath: string): string | null {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? null
}

/**
 * Every asset path any product currently points at.
 *
 * This is the allowlist behind /api/asset. The app has no auth and runs on a
 * laptop, but a route that reads whatever absolute path a query string names
 * is still a file browser for the whole disk. Serving only what a product row
 * already registers keeps it to what the app was going to show anyway.
 */
export function registeredAssetPaths(): Set<string> {
  const rows = db
    .select({
      logoOnLight: products.logoOnLight,
      logoOnDark: products.logoOnDark,
      iconOnLight: products.iconOnLight,
      iconOnDark: products.iconOnDark,
      screenshots: products.screenshots,
    })
    .from(products)
    .all()

  const paths = new Set<string>()
  for (const row of rows) {
    for (const single of [row.logoOnLight, row.logoOnDark, row.iconOnLight, row.iconOnDark]) {
      if (single) paths.add(single)
    }
    for (const shot of parseJsonArray(row.screenshots)) paths.add(shot)
  }
  return paths
}

export function isRegisteredAsset(filePath: string) {
  return registeredAssetPaths().has(filePath)
}

/** The URL that renders a registered asset in an <img>. */
export function assetSrc(filePath: string) {
  return `/api/asset?p=${encodeURIComponent(filePath)}`
}

/**
 * True when the path is a copy this app made, which is what makes deleting it
 * safe. Resolved first so `data/assets/../../etc/passwd` cannot pass as ours.
 */
export function isInsideAssetDir(filePath: string) {
  const resolved = path.resolve(filePath)
  return resolved === ASSET_DIR || resolved.startsWith(`${ASSET_DIR}${path.sep}`)
}

/** Keeps an uploaded filename from escaping its product folder. */
export function safeFileName(name: string) {
  const base = path
    .basename(name)
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'asset'
}
