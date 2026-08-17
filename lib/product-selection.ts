import 'server-only'

import { cookies } from 'next/headers'

import { getProduct, listProducts } from '@/lib/queries'
import type { Product } from '@/db/schema'

export const PRODUCT_COOKIE = 'submitdock.product'

export async function selectedProductSlug(): Promise<string | null> {
  const store = await cookies()
  return store.get(PRODUCT_COOKIE)?.value ?? null
}

/**
 * The product every page works against. Falls back to the first one so a fresh
 * install is never stuck on an empty panel with a product sitting right there.
 */
export async function activeProduct(): Promise<Product | null> {
  const slug = await selectedProductSlug()
  if (slug) {
    const product = getProduct(slug)
    if (product) return product
  }
  return listProducts()[0] ?? null
}
