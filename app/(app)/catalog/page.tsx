import { CatalogFilters } from '@/components/catalog-filters'
import { CatalogSwitcher } from '@/components/catalog-switcher'
import { CatalogTable } from '@/components/catalog-table'
import { Reveal } from '@/components/ui/reveal'
import { activeCatalog } from '@/lib/catalog-selection'
import { activeProduct } from '@/lib/product-selection'
import { listCatalog, listCatalogs, type CatalogFilters as Filters } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Catalog' }

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function many(value: string | string[] | undefined) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

/*
 * No tab row here any more. All / Ready to send / Needs you / No form found /
 * Tier A were five saved filters dressed as navigation, and every one of them
 * is a combination the filter bar underneath already expresses. Two ways to
 * narrow the same list, sitting on top of each other, and the tabs silently
 * won: a tab plus a filter gave you the intersection with no sign that it had.
 */
export default async function CatalogPage(props: PageProps<'/catalog'>) {
  const searchParams = await props.searchParams
  const [product, catalog] = await Promise.all([activeProduct(), activeCatalog()])
  const catalogs = listCatalogs()

  const scope: Filters = { catalog: catalog?.slug ?? null }

  const filters: Filters = {
    ...scope,
    q: one(searchParams.q),
    status: one(searchParams.status),
    tier: one(searchParams.tier),
    submitUrl: one(searchParams.submitUrl) as Filters['submitUrl'],
    state: one(searchParams.state),
    blocker: one(searchParams.blocker),
    requires: many(searchParams.requires),
    as: one(searchParams.as),
    linkRel: one(searchParams.linkRel),
    sort: one(searchParams.sort),
  }

  const everything = listCatalog(product?.slug ?? null, scope)
  const rows = listCatalog(product?.slug ?? null, filters)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Wider than the max-w-5xl of a tiles-and-chart screen: this one is a
          table, and squeezing hundreds of rows into the reading column helps nobody. */}
      <Reveal
      from="up"
      duration={400}
      className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-sm text-muted-foreground">
          {catalog ? catalog.name : 'No catalog'}, {everything.length} domains. Open a row to
          grade it, set its state for {product ? product.name : 'a product'}, and paste the
          listing URL.
        </p>
        </div>
        <CatalogSwitcher catalogs={catalogs} active={catalog?.slug ?? null} />
      </div>

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
