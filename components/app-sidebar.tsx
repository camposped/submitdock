'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { AgentActivity } from '@/components/agent-activity'
import { Mark, Wordmark } from '@/components/logo'
import { ProductSwitcher, type ProductOption } from '@/components/product-switcher'
import { cn } from '@/lib/utils'

import { NAV_GROUPS, type NavItem } from './nav'

/* Rows measured off the boilerplate: 34px tall, 13px/500 text, 8px radius,
 * the active pill barely darker than the canvas it sits on. Icons ride a
 * touch smaller and lighter than the labels so the text leads. */
const ROW_CLASSES = 'h-[34px] gap-2.5 rounded-lg px-3 text-[13px] font-medium [&_svg]:size-3.5'

export function AppSidebar({
  products,
  activeProduct,
  counts,
}: {
  products: ProductOption[]
  activeProduct: ProductOption
  /**
   * The size of the list behind each row. Deliberately the same number the
   * screen's own header shows: the badge this replaced was a filtered count,
   * which read as the list's size and was not.
   */
  counts: Partial<Record<NavItem['href'], number>>
}) {
  const pathname = usePathname()
  const { setOpen, setOpenMobile, isMobile } = useSidebar()
  // Optimistic selection: highlight the clicked item immediately instead of
  // when the server finishes rendering the new page. The snapshot of the
  // pathname at click time makes this self-expiring.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null)
  const displayedPath = clicked && clicked.from === pathname ? clicked.href : pathname

  // The kit has its own sub-rail, so this one folds to icons on the way in and
  // opens again on the way out. Only route *crossings* drive it: a manual
  // toggle while inside is respected until the next crossing.
  const wasRailed = useRef<boolean | null>(null)
  useEffect(() => {
    const railed = pathname.startsWith('/product')
    if (!isMobile && wasRailed.current !== railed) setOpen(!railed)
    wasRailed.current = railed
  }, [pathname, isMobile, setOpen])

  return (
    <Sidebar collapsible="icon">
      {/* h-14 + border-b mirrors the content header, so the hairline runs
          unbroken across the sidebar and the page. */}
      <SidebarHeader className="h-14 shrink-0 justify-center border-b px-3 group-data-[collapsible=icon]:px-0">
        <ProductSwitcher products={products} active={activeProduct} />
      </SidebarHeader>

      <SidebarContent className="gap-3 px-3 pt-3 group-data-[collapsible=icon]:px-2">
        {NAV_GROUPS.map((group, i) => (
          <SidebarGroup
            key={group.label ?? 'main'}
            // Collapsed to the icon rail the labels vanish, so a faint
            // hairline marks where one section ends and the next begins.
            className={cn(
              'p-0',
              i > 0 &&
                'group-data-[collapsible=icon]:border-t group-data-[collapsible=icon]:border-border/60 group-data-[collapsible=icon]:pt-3',
            )}
          >
            {group.label && (
              <SidebarGroupLabel className="pointer-events-none px-3 text-[13px] font-medium text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {group.items.map((item) => {
                  const active =
                    item.href === '/' ? displayedPath === '/' : displayedPath.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={ROW_CLASSES}
                      >
                        <Link
                          href={item.href}
                          onClick={() => {
                            setClicked({ href: item.href, from: pathname })
                            if (isMobile) setOpenMobile(false)
                          }}
                        >
                          <item.icon className="shrink-0 text-muted-foreground/90" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {counts[item.href] !== undefined && counts[item.href]! > 0 && (
                        <SidebarMenuBadge className="text-[11px] font-normal tabular-nums text-muted-foreground peer-data-[size=default]/menu-button:top-[9px] peer-hover/menu-button:text-muted-foreground">
                          {counts[item.href]}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* The activity panel sits above the sign-off, because what the agent is
          doing right now outranks the brand. It hides on the icon rail: there
          is no width for a sentence there. */}
      <SidebarFooter className="gap-2 p-2">
        <AgentActivity />
        <div className="relative flex items-center group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Mark className="hidden group-data-[collapsible=icon]:block" />
          <SidebarTrigger className="size-8 text-muted-foreground" />
          <div className="pointer-events-none absolute inset-x-0 flex justify-center group-data-[collapsible=icon]:hidden">
            <Wordmark className="h-6" />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
