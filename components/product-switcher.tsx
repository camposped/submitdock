'use client'

import { useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { Check, ChevronsUpDown, Package, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createProduct, selectProduct } from '@/lib/actions'
import { cn } from '@/lib/utils'

export type ProductOption = {
  slug: string
  name: string
  /** Square icon for a light surface, and for a dark one. Either may be empty. */
  iconOnLight: string
  iconOnDark: string
}

/**
 * The product's own square icon, falling back to a generic tile.
 *
 * Which file to show is a theme question, so CSS answers it: the sidebar is
 * light in the light theme and dark in the dark one, and each icon is drawn
 * for one of those. Both render and one is hidden, because the server does not
 * know the theme and picking in JS would be a hydration mismatch. A product
 * that only uploaded one of the two shows that one in both themes, which is
 * still better than a placeholder.
 */
function ProductTile({ product, className }: { product: ProductOption; className?: string }) {
  const light = product.iconOnLight || product.iconOnDark
  const dark = product.iconOnDark || product.iconOnLight

  if (!light) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md bg-foreground text-background',
          className,
        )}
      >
        <Package className="size-3.5" strokeWidth={2.25} />
      </span>
    )
  }

  const shared = 'size-full rounded-md object-contain'
  return (
    <span className={cn('relative flex shrink-0 overflow-hidden rounded-md', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/asset from an absolute path */}
      <img src={assetSrc(light)} alt="" className={cn(shared, 'dark:hidden')} />
      {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/asset from an absolute path */}
      <img src={assetSrc(dark)} alt="" className={cn(shared, 'hidden dark:block')} />
    </span>
  )
}

function assetSrc(filePath: string) {
  return `/api/asset?p=${encodeURIComponent(filePath)}`
}

function CreateSubmit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create product'}
    </Button>
  )
}

/**
 * The workspace switcher's slot, holding the thing this tool actually switches
 * between. Every screen except the catalog's shared columns is scoped to the
 * product chosen here, so it sits above the nav rather than inside it.
 */
export function ProductSwitcher({
  products,
  active,
}: {
  products: ProductOption[]
  active: ProductOption
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-1 py-1 hover:bg-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <ProductTile product={active} className="size-6" />
          <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold group-data-[collapsible=icon]:hidden">
            {active.name}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-64 p-1.5">
          <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">Products</p>
          <div className="flex flex-col">
            {products.map((product) => (
              <button
                key={product.slug}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (product.slug !== active.slug) {
                    startTransition(() => selectProduct(product.slug))
                  }
                  setOpen(false)
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                  product.slug === active.slug && 'font-medium',
                )}
              >
                <ProductTile product={product} className="size-5" />
                <span className="min-w-0 flex-1 truncate">{product.name}</span>
                {product.slug === active.slug && <Check className="size-3.5 shrink-0 text-info" />}
              </button>
            ))}
          </div>
          <div className="mt-1.5 border-t pt-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setCreating(true)
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-3.5" />
              Add a product
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New product</DialogTitle>
            <DialogDescription>
              The same catalog serves every product. This adds its own submission states and its
              own kit of answers.
            </DialogDescription>
          </DialogHeader>
          <form
            action={async (formData) => {
              await createProduct(formData)
              setCreating(false)
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-product-name">Name</Label>
              <Input
                id="new-product-name"
                name="name"
                autoFocus
                required
                placeholder="Acme App"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-product-slug">Slug</Label>
              <Input
                id="new-product-slug"
                name="slug"
                required
                placeholder="acme-app"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Used in the URL, and by the agent to scope a run to this product.
              </p>
            </div>
            <div className="flex justify-end">
              <CreateSubmit />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
