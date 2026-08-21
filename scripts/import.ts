import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { importCatalog } from '../lib/catalog-io'

/**
 * Loads a catalog snapshot.
 *
 *   npm run import                                  # the snapshot in this repo
 *   npm run import -- lists/awesome.json \
 *     --catalog awesome-saas \
 *     --name "Awesome SaaS directories" \
 *     --url https://github.com/someone/awesome-saas
 *
 * With `--catalog` the domains are filed into that list, creating it if it is
 * new. With no arguments at all the repo's own snapshot is loaded into the
 * list it came from, so a fresh clone has something to select.
 *
 * Importing a list that overlaps one you already have costs nothing. A catalog
 * is membership: the facts about a domain live once and every list that names
 * it shares them.
 */
const args = process.argv.slice(2)

function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  if (i === -1) return undefined
  const value = args[i + 1]
  return value && !value.startsWith('--') ? value : ''
}

const positional = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))

const IN = positional
  ? path.resolve(positional)
  : path.join(process.cwd(), 'data', 'catalog.export.json')

if (!existsSync(IN)) {
  console.error(`nothing to import: ${IN} does not exist`)
  process.exit(1)
}

/**
 * The list the repo ships, so a fresh clone has a catalog to select rather
 * than an empty switcher and a screen scoped to nothing.
 */
const SHIPPED = {
  slug: 'supapin-2025',
  name: 'Supapin 2025 crawl',
  description:
    'A crawl of the directories a paid submission service used, with reachability, submit URLs and blocker flags.',
  sourceUrl: null,
}

const slug = flag('catalog')?.trim()
const into = slug
  ? {
      slug,
      name: flag('name')?.trim() || slug,
      description: flag('description')?.trim() || '',
      sourceUrl: flag('url')?.trim() || null,
    }
  : positional
    ? undefined
    : SHIPPED

const db = openDb()
const stats = importCatalog(db, JSON.parse(readFileSync(IN, 'utf8')), into)

logEvent(db, {
  action: 'catalog.import',
  detail: { file: path.relative(process.cwd(), IN), catalog: slug ?? null, ...stats },
})

console.log(
  `imported ${path.relative(process.cwd(), IN)}: ` +
    `${stats.inserted} new, ${stats.updated} updated, ${stats.unchanged} unchanged` +
    (stats.skipped ? `, ${stats.skipped} skipped` : ''),
)
if (into) console.log(`  filed ${stats.filed} into "${into.name}"`)
