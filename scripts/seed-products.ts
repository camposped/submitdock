import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { eq } from 'drizzle-orm'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { products, type NewProduct } from '../db/schema'

/**
 * Products live in the database, and the normal way to add one is the switcher
 * at the top of the sidebar. This script exists for the other case: rebuilding
 * a machine from scratch without retyping a kit.
 *
 * It reads `data/products.local.json`, which is gitignored, because a kit is
 * full of things that belong to you and not to this repo: your descriptions,
 * your contact address, and absolute paths into your own project folders.
 * `data/products.example.json` shows the shape.
 */
const LOCAL = path.join(process.cwd(), 'data', 'products.local.json')
const EXAMPLE = path.join(process.cwd(), 'data', 'products.example.json')

const source = existsSync(LOCAL) ? LOCAL : EXAMPLE
const force = process.argv.includes('--force')

const rows = JSON.parse(readFileSync(source, 'utf8')) as NewProduct[]
const db = openDb()

console.log(`reading ${path.relative(process.cwd(), source)}`)

for (const product of rows) {
  const [existing] = db.select().from(products).where(eq(products.slug, product.slug)).limit(1).all()

  if (existing && !force) {
    console.log(`  ${product.slug} already exists, left alone (pass --force to overwrite)`)
    continue
  }

  if (existing) {
    db.update(products).set(product).where(eq(products.slug, product.slug)).run()
    console.log(`  ${product.slug} overwritten`)
  } else {
    db.insert(products).values(product).run()
    console.log(`  ${product.slug} created`)
  }

  logEvent(db, {
    action: existing ? 'product.overwritten' : 'product.created',
    actor: 'human',
    productSlug: product.slug,
    detail: { name: product.name, url: product.url },
  })
}

if (source === EXAMPLE) {
  console.log('')
  console.log('  That was the example product. Copy data/products.example.json to')
  console.log('  data/products.local.json and edit it, or just use the sidebar switcher.')
}
