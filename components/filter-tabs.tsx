'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'

export type FilterTab = {
  /** Empty string is the "everything" tab. */
  value: string
  label: string
  count: number
  /** Colours the count when the tab is an outcome rather than a bucket. */
  tone?: 'good' | 'bad' | 'info'
}

/**
 * Named views over one list, as links rather than buttons.
 *
 * The tab is a query param, so a view can be linked to, bookmarked and sent
 * back to yourself. That is also what lets the Blocked screen become a tab:
 * it was only ever a filter with a page around it.
 */
export function FilterTabs({ param, tabs }: { param: string; tabs: FilterTab[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(param) ?? ''

  function hrefFor(value: string) {
    const next = new URLSearchParams(searchParams.toString())
    if (value) next.set(param, value)
    else next.delete(param)
    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b pb-px">
      {tabs.map((tab) => {
        const active = current === tab.value
        return (
          <Link
            key={tab.value || 'all'}
            href={hrefFor(tab.value)}
            scroll={false}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-t-md border-b-2 px-3 py-1.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-px text-[11px] tabular-nums',
                active ? 'bg-accent text-foreground' : 'text-muted-foreground/70',
                !active && tab.tone === 'good' && 'text-good',
                !active && tab.tone === 'bad' && 'text-bad',
                !active && tab.tone === 'info' && 'text-info',
              )}
            >
              {tab.count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
