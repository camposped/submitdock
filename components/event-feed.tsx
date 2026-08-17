import { Bot, User } from 'lucide-react'

import type { EventRow } from '@/db/schema'
import { eventLabel } from '@/lib/event-labels'
import { cn } from '@/lib/utils'

/** Only the parts of a detail blob worth a glance in the feed. */
function summarize(event: EventRow): string {
  let detail: Record<string, unknown>
  try {
    detail = JSON.parse(event.detail) as Record<string, unknown>
  } catch {
    return ''
  }

  const parts: string[] = []
  for (const [key, value] of Object.entries(detail)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      parts.push(`${key} ${value.length > 2 ? `${value.length} items` : value.join(', ')}`)
      continue
    }
    if (typeof value === 'object') continue
    parts.push(`${key} ${String(value)}`)
  }
  return parts.slice(0, 3).join(' · ')
}

function clock(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(11, 16)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const day = (iso: string) => iso.slice(0, 10)

export function EventFeed({ events }: { events: EventRow[] }) {
  // Worked out up front rather than tracked while mapping, so the render stays
  // a pure function of the props.
  const rows = events.map((event, index) => ({
    event,
    startsDay: day(event.at) !== (index > 0 ? day(events[index - 1].at) : ''),
  }))

  return (
    <ol className="flex flex-col">
      {rows.map(({ event, startsDay }) => {
        const summary = summarize(event)
        const Icon = event.actor === 'human' ? User : Bot

        return (
          <li key={event.id}>
            {startsDay && (
              <div className="flex items-center gap-3 pt-4 pb-2 first:pt-0">
                <span className="text-xs font-medium text-muted-foreground">{day(event.at)}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="flex items-baseline gap-3 border-b py-2 last:border-0">
              <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground">
                {clock(event.at)}
              </span>
              <Icon
                className={cn(
                  'size-3.5 shrink-0 translate-y-0.5',
                  event.ok ? 'text-muted-foreground' : 'text-bad',
                )}
              />
              <span className="w-52 shrink-0 truncate text-xs" title={event.action}>
                {eventLabel(event.action)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {event.domain && <span className="text-foreground">{event.domain}</span>}
                {event.domain && summary ? ' · ' : null}
                {summary}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
