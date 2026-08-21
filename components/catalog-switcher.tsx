'use client'

import { useTransition } from 'react'
import { Library } from 'lucide-react'

import { Select } from '@/components/ui/select'
import { selectCatalog } from '@/lib/actions'

export type CatalogOption = {
  slug: string
  name: string
  domains: number
  exclusive: number
}

/**
 * Which list the whole app is working against.
 *
 * It sits on this screen rather than beside the product switcher because that
 * is where the consequence is visible, and the count beside each name is what
 * makes the choice informed: "only here" says whether a list is worth having
 * or is a subset of one already loaded.
 */
export function CatalogSwitcher({
  catalogs,
  active,
}: {
  catalogs: CatalogOption[]
  active: string | null
}) {
  const [pending, start] = useTransition()

  if (catalogs.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <Library className="size-4 shrink-0 text-muted-foreground" />
      <Select
        className="h-9 w-64"
        aria-label="Catalog"
        disabled={pending}
        value={active ?? ''}
        onValueChange={(slug) => start(() => void selectCatalog(slug))}
        options={catalogs.map((catalog) => ({
          value: catalog.slug,
          label:
            catalog.exclusive > 0 && catalogs.length > 1
              ? `${catalog.name} (${catalog.domains}, ${catalog.exclusive} only here)`
              : `${catalog.name} (${catalog.domains})`,
        }))}
      />
    </div>
  )
}
