import { AppHeader } from '@/components/app-header'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { activeCatalog } from '@/lib/catalog-selection'
import { PRODUCT } from '@/lib/product.config'
import { activeProduct } from '@/lib/product-selection'
import { listCatalog, listProducts, listSubmissions } from '@/lib/queries'

/**
 * The product shell. No auth guard and no workspace lookup: SubmitDock runs on
 * one machine against one local file, so the only thing the shell resolves is
 * which product the campaign screens are scoped to.
 */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const products = listProducts()
  const [active, catalog] = await Promise.all([activeProduct(), activeCatalog()])

  const counts = {
    // Scoped to the selected list, so the rail and the screen's own header
    // never quote two different sizes for the same thing.
    '/catalog': listCatalog(null, { catalog: catalog?.slug ?? null }).length,
    '/submissions': listSubmissions(active?.slug ?? null).length,
  }

  const options = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    iconOnLight: p.iconOnLight,
    iconOnDark: p.iconOnDark,
  }))
  const activeOption = active
    ? {
        slug: active.slug,
        name: active.name,
        iconOnLight: active.iconOnLight,
        iconOnDark: active.iconOnDark,
      }
    : { slug: '', name: PRODUCT.name, iconOnLight: '', iconOnDark: '' }

  return (
    <TooltipProvider>
      <Toaster />
      {/* 232px is the boilerplate's rail width. */}
      <SidebarProvider style={{ '--sidebar-width': '232px' } as React.CSSProperties}>
        <AppSidebar
          products={options.length > 0 ? options : [activeOption]}
          activeProduct={activeOption}
          counts={counts}
        />
        <SidebarInset className="h-svh min-w-0">
          <AppHeader />
          {/* No overflow here on purpose. Scrolling belongs to each page, or
              on a railed section to its content column, so a sub-rail is never
              part of a scroller and cannot drift with it. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
