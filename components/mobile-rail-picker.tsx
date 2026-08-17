'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronsUpDown, type LucideIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type RailGroup = {
  label: string | null
  items: Array<{ href: string; title: string; active: boolean; icon?: LucideIcon }>
}

/**
 * The sub-rail's mobile form: the rails are hidden below md, so this one-row
 * picker (current section + chevron, opening the same grouped list) stands in
 * at the top of the content column.
 */
export function MobileRailPicker({ groups }: { groups: RailGroup[] }) {
  const [open, setOpen] = useState(false)
  const current = groups.flatMap((g) => g.items).find((i) => i.active)

  return (
    <div className="border-b px-4 py-2 md:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-accent">
          <span className="flex min-w-0 items-center gap-2.5">
            {current?.icon && <current.icon className="size-3.5 shrink-0 text-muted-foreground/70" />}
            <span className="truncate">{current?.title ?? 'Sections'}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto p-1.5">
          <div className="flex flex-col gap-3">
            {groups.map((group, gi) => (
              <div key={group.label ?? gi}>
                {group.label && (
                  <p className="px-2 pt-1 pb-1 text-xs font-semibold text-foreground">{group.label}</p>
                )}
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
                        item.active && 'bg-accent font-medium text-foreground',
                      )}
                    >
                      {item.icon && <item.icon className="size-3.5 shrink-0 text-muted-foreground/70" />}
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
