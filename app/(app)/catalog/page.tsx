import { CatalogFilters } from '@/components/catalog-filters'
import { CatalogTable } from '@/components/catalog-table'
import { FilterTabs, type FilterTab } from '@/components/filter-tabs'
import { Reveal } from '@/components/ui/reveal'
import { activeProduct } from '@/lib/product-selection'
import {
  isReadyToSend,
  listCatalog,
  needsHuman,
  type CatalogFilters as Filters,
  type CatalogRow,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Catalog' }

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function many(value: string | string[] | undefined) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * The named views. "Needs you" used to be a screen of its own, which read as a
 * submission status and is not one: it is a property of the directory. As a
 * tab over the same list it says what it is.
 */
const VIEWS: Record<string, (row: CatalogRow) => boolean> = {
  ready: isReadyToSend,
  'needs-you': needsHuman,
  'no-form': (row) => !row.submitUrl && row.status !== 'dead',
  'tier-a': (row) => row.tier === 'a',
  dead: (row) => row.status === 'dead',
}

export default async function CatalogPage(props: PageProps<'/catalog'>) {
  const searchParams = await props.searchParams
  const product = await activeProduct()

  const filters: Filters = {
    q: one(searchParams.q),
    status: one(searchParams.status),
    tier: one(searchParams.tier),
    submitUrl: one(searchParams.submitUrl) as Filters['submitUrl'],
    state: one(searchParams.state),
    requires: many(searchParams.requires),
    dr: one(searchParams.dr),
    linkRel: one(searchParams.linkRel),
    sort: one(searchParams.sort),
  }

  const view = one(searchParams.view) ?? ''
  const everything = listCatalog(product?.slug ?? null)
  const filtered = listCatalog(product?.slug ?? null, filters)
  const rows = VIEWS[view] ? filtered.filter(VIEWS[view]) : filtered

  const count = (key: string) => everything.filter(VIEWS[key]).length
  const tabs: FilterTab[] = [
    { value: '', label: 'All', count: everything.length },
    { value: 'ready', label: 'Ready to send', count: count('ready'), tone: 'good' },
    { value: 'needs-you', label: 'Needs you', count: count('needs-you'), tone: 'info' },
    { value: 'no-form', label: 'No form found', count: count('no-form') },
    { value: 'tier-a', label: 'Tier A', count: count('tier-a') },
    { value: 'dead', label: 'Dead', count: count('dead'), tone: 'bad' },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Wider than the max-w-5xl of a tiles-and-chart screen: this one is a
          table, and squeezing 367 rows into the reading column helps nobody. */}
      <Reveal
      from="up"
      duration={400}
      className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6 sm:p-8"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Everything you could submit to, shared across products. Open a row to grade it, set
          its state for {product ? product.name : 'a product'}, and paste the listing URL.
        </p>
      </div>

      <FilterTabs param="view" tabs={tabs} />

      <CatalogFilters
        hasProduct={Boolean(product)}
        shown={rows.length}
        total={everything.length}
      />

      <CatalogTable
        rows={rows}
        productSlug={product?.slug ?? null}
        productName={product?.name ?? null}
      />
    </Reveal>
    </div>
  )
}
