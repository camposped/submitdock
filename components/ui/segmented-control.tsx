'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SegmentedPill, useSegmentedPill } from '@/components/ui/segmented-pill'

export type SegmentedItem = { key: string; label: string; href: string }
export type SegmentedButtonItem = { key: string; label: string; extra?: ReactNode }

/**
 * Link-driven segmented control: a neutral muted rail with the
 * active segment raised on a white pill that slides between items. Selection
 * lives in the URL, so the server re-renders the filtered page — this is a
 * client component only to animate the pill.
 */
export function SegmentedControl({
  items,
  active,
  className,
  size = 'md',
}: {
  items: SegmentedItem[]
  active: string
  className?: string
  size?: 'md' | 'sm'
}) {
  const { containerRef, setItemRef, rect, animated } = useSegmentedPill(active)
  return (
    <nav
      ref={(el) => {
        containerRef.current = el
      }}
      className={cn(
        'relative inline-flex w-fit flex-wrap items-center gap-1 rounded-lg bg-muted',
        size === 'sm' ? 'p-0.5' : 'p-1',
        className,
      )}
    >
      <SegmentedPill rect={rect} animated={animated} />
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            ref={setItemRef(item.key)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              // Before the first measurement (SSR/hydration) the active link
              // carries the background itself.
              isActive && !rect && 'bg-card shadow-sm',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * State-driven sibling of SegmentedControl: same rail, same sliding pill,
 * but plain buttons and an onSelect callback for choices that live in client
 * state rather than the URL (pricing interval, connection method, ...).
 */
export function SegmentedButtons({
  items,
  active,
  onSelect,
  className,
  size = 'md',
}: {
  items: SegmentedButtonItem[]
  active: string
  onSelect: (key: string) => void
  className?: string
  size?: 'md' | 'sm'
}) {
  const { containerRef, setItemRef, rect, animated } = useSegmentedPill(active)
  return (
    <div
      ref={(el) => {
        containerRef.current = el
      }}
      role="tablist"
      className={cn(
        'relative inline-flex w-fit flex-wrap items-center gap-1 rounded-lg bg-muted',
        size === 'sm' ? 'p-0.5' : 'p-1',
        className,
      )}
    >
      <SegmentedPill rect={rect} animated={animated} />
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(item.key)}
            ref={setItemRef(item.key)}
            className={cn(
              // flex-1 is inert while the container hugs its content (w-fit),
              // but a caller stretching it with w-full gets equal-width
              // segments filling the row instead of a left-hugging cluster.
              'relative inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              isActive && !rect && 'bg-card shadow-sm',
            )}
          >
            {item.label}
            {item.extra}
          </button>
        )
      })}
    </div>
  )
}
