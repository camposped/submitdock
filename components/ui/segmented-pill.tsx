'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * The sliding-pill mechanism behind SegmentedControl: an
 * absolutely-positioned <span> behind the items is measured
 * against the active one and animates left/top/width/height to it. top/height
 * matter because the rail can wrap. The first positioning happens without a
 * transition (otherwise the pill "flies in" from a corner on mount); until a
 * measurement exists, the active item carries its own background so SSR shows
 * no flash.
 */

type PillRect = { left: number; top: number; width: number; height: number }

export function useSegmentedPill(activeKey: string) {
  const containerRef = useRef<HTMLElement | null>(null)
  const itemsRef = useRef(new Map<string, HTMLElement>())
  const [rect, setRect] = useState<PillRect | null>(null)
  const [animated, setAnimated] = useState(false)

  const setItemRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) itemsRef.current.set(key, el)
      else itemsRef.current.delete(key)
    },
    [],
  )

  const measure = useCallback(() => {
    const el = itemsRef.current.get(activeKey)
    if (!el) {
      setRect(null)
      return
    }
    setRect({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight })
  }, [activeKey])

  useEffect(() => {
    measure()
    // Enable the transition only after the first position has painted.
    const id = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(id)
  }, [measure])

  // Re-measure when the rail resizes (wrapping, font load, window resize).
  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(container)
    return () => observer.disconnect()
  }, [measure])

  return { containerRef, setItemRef, rect, animated }
}

export function SegmentedPill({ rect, animated }: { rect: PillRect | null; animated: boolean }) {
  if (!rect) return null
  const style: CSSProperties = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        'absolute rounded-md bg-card shadow-sm',
        animated && 'transition-[left,top,width,height] duration-200 ease-out motion-reduce:transition-none',
      )}
    />
  )
}
