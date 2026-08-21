import 'server-only'

import { cookies } from 'next/headers'

import { getCatalog, listCatalogs } from '@/lib/queries'
import type { Catalog } from '@/db/schema'

export const CATALOG_COOKIE = 'submitdock.catalog'

export async function selectedCatalogSlug(): Promise<string | null> {
  const store = await cookies()
  return store.get(CATALOG_COOKIE)?.value ?? null
}

/**
 * The catalog every screen works against, chosen the same way the product is.
 *
 * There is no "all lists" option on purpose. A pass is run against one list,
 * and a union of every list would hand the agent whatever the loosest curator
 * on the internet happened to include. Picking is the point.
 */
export async function activeCatalog(): Promise<Catalog | null> {
  const slug = await selectedCatalogSlug()
  if (slug) {
    const catalog = getCatalog(slug)
    if (catalog) return catalog
  }
  return listCatalogs()[0] ?? null
}
