'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, CircleDot, Loader2 } from 'lucide-react'

import { eventLabel } from '@/lib/event-labels'
import { cn } from '@/lib/utils'

type Activity = {
  run: {
    id: number
    label: string
    step: string | null
    done: number | null
    total: number | null
    startedAt: string
  } | null
  lastEvent: { id: number; action: string; at: string; ok: boolean; domain: string | null } | null
  stamp: string
}

/** Poll fast while something is happening, slowly while nothing is. */
const BUSY_MS = 2_000
const IDLE_MS = 10_000

function ago(iso: string) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.round(minutes / 60)}h`
}

/**
 * What the agent is doing, live, at the bottom of the rail.
 *
 * SubmitDock is the copilot seat: the agent fills the forms in a browser and
 * writes here, and this panel is how you see that happening without reading a
 * terminal. It polls a small JSON route rather than refreshing on a timer, and
 * only asks the router to re-render when the stamp changes, so a screen full of
 * rows updates because something happened and not because time passed.
 */
export function AgentActivity() {
  const router = useRouter()
  const [activity, setActivity] = useState<Activity | null>(null)
  const lastStamp = useRef<string | null>(null)
  const [, setTick] = useState(0)

  const poll = useCallback(async () => {
    try {
      const response = await fetch('/api/activity', { cache: 'no-store' })
      if (!response.ok) return
      const next = (await response.json()) as Activity
      setActivity(next)

      // First read just records where we are; after that a changed stamp means
      // the database moved, which is the only reason to re-render the page.
      if (lastStamp.current !== null && lastStamp.current !== next.stamp) router.refresh()
      lastStamp.current = next.stamp
    } catch {
      // A failed poll is not worth surfacing: the next one is two seconds away.
    }
  }, [router])

  // Polling an external system is what an effect is for, and the state lands in
  // the fetch callback rather than in the effect body: the first read is
  // scheduled rather than called, so nothing here sets state synchronously.
  useEffect(() => {
    const period = activity?.run ? BUSY_MS : IDLE_MS
    const first = setTimeout(() => void poll(), 0)
    const interval = setInterval(() => void poll(), period)
    return () => {
      clearTimeout(first)
      clearInterval(interval)
    }
  }, [poll, activity?.run])

  // Keeps the elapsed counter honest between polls.
  useEffect(() => {
    if (!activity?.run) return
    const timer = setInterval(() => setTick((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [activity?.run])

  const run = activity?.run
  const lastEvent = activity?.lastEvent

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-2.5 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center gap-2">
        {run ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : (
          <CircleDot className="size-3.5 shrink-0 text-muted-foreground/50" />
        )}
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {run ? 'Agent working' : 'Agent idle'}
        </span>
        {run && (
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {ago(run.startedAt)}
          </span>
        )}
      </div>

      {run ? (
        <>
          <p className="text-xs leading-snug font-medium">{run.label}</p>
          {run.step && <p className="text-[11px] leading-snug text-muted-foreground">{run.step}</p>}
          {run.total !== null && run.total > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${Math.min(100, ((run.done ?? 0) / run.total) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {run.done ?? 0}/{run.total}
              </span>
            </div>
          )}
        </>
      ) : lastEvent ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground/70">Last thing that happened</span>
          <p className="flex items-start gap-1.5 text-[11px] leading-snug">
            <CircleCheck
              className={cn('mt-px size-3 shrink-0', lastEvent.ok ? 'text-good' : 'text-bad')}
            />
            <span className="min-w-0 flex-1">
              {eventLabel(lastEvent.action)}
              {lastEvent.domain && (
                <span className="text-muted-foreground"> on {lastEvent.domain}</span>
              )}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {ago(lastEvent.at)} ago
            </span>
          </p>
        </div>
      ) : (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Nothing has run yet. Ask your agent to start a submission pass.
        </p>
      )}
    </div>
  )
}
