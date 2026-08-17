'use client'

import { Fragment } from 'react'
import Link from 'next/link'

import { usePathname } from 'next/navigation'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

import { crumbsFor } from './nav'

export function AppHeader() {
  const pathname = usePathname()
  const crumbs = crumbsFor(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      {/* Desktop collapse lives in the sidebar footer; on mobile the sidebar
          is an off-canvas sheet, so it needs an opener up here. */}
      <SidebarTrigger className="-ml-1 text-muted-foreground md:hidden" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap text-[13px]">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1
            return (
              <Fragment key={`${crumb.href ?? crumb.title}-${i}`}>
                {i > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
                <BreadcrumbItem className={last ? 'min-w-0' : 'hidden sm:inline-flex'}>
                  {crumb.href ? (
                    <BreadcrumbLink asChild className="truncate">
                      <Link href={crumb.href}>{crumb.title}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="truncate font-medium">{crumb.title}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <ThemeToggle />
      </div>
    </header>
  )
}
