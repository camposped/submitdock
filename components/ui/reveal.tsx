'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RevealFrom = 'up' | 'fade' | 'left'

const HIDDEN: Record<RevealFrom, string> = {
  up: 'motion-safe:translate-y-6 motion-safe:opacity-0',
  fade: 'motion-safe:opacity-0',
  left: 'motion-safe:-translate-x-6 motion-safe:opacity-0',
}

/**
 * Entrance animation: content fades and
 * slides into place the first time it enters the viewport. `from` picks the
 * direction, `delay` staggers siblings.
 *
 * Reduced-motion safe: the hidden state is gated behind motion-safe:, so
 * prefers-reduced-motion never hides content and the observer is skipped.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  duration = 700,
  from = 'up',
  once = true,
}: {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  from?: RevealFrom
  once?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Under reduced motion the hidden state never applies, so the content is
    // already visible — skip the observer entirely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // A ratio threshold cannot be met by an element taller than the viewport:
    // 15% of a 20,000px catalog is 3,000px and only ~800px can ever be on
    // screen, so the observer would never fire and the page would sit at
    // opacity-0 forever. Tall content falls back to "any part visible".
    const threshold = el.getBoundingClientRect().height > window.innerHeight ? 0 : 0.15

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          if (once) io.disconnect()
        } else if (!once) {
          setShown(false)
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms`, transitionDuration: `${duration}ms` }}
      className={cn(
        'motion-safe:transition-all motion-safe:ease-out',
        // The shown state carries NO translate (not even *-0): any translate
        // creates a containing block and captures position:fixed descendants.
        shown ? 'opacity-100' : HIDDEN[from],
        className,
      )}
    >
      {children}
    </div>
  )
}
