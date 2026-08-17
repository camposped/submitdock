import { Check, CircleDashed, CircleSlash, Clock, Link2, Link2Off, type LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { SubmissionState } from '@/db/schema'
import { cn } from '@/lib/utils'

/**
 * The campaign's vocabulary as colour.
 *
 * Only three outcomes are real: it worked (a confirmed link), it failed, or it
 * is still in flight. Everything else is neutral, so a screen of forty rows
 * shows the handful that need reading rather than a wall of colour.
 */
export const STATE_TONE: Record<SubmissionState, string> = {
  todo: 'border-transparent bg-muted text-muted-foreground',
  skipped: 'border-transparent bg-muted text-muted-foreground',
  submitted: 'border-transparent bg-info/10 text-info',
  verified: 'border-transparent bg-info/10 text-info',
  live: 'border-transparent bg-good/10 text-good',
  rejected: 'border-transparent bg-bad/10 text-bad',
}

/** Colour is never the only carrier: every tag ships the icon for its state. */
export const STATE_ICON: Record<SubmissionState, LucideIcon> = {
  todo: CircleDashed,
  skipped: CircleSlash,
  submitted: Clock,
  verified: Clock,
  live: Check,
  rejected: CircleSlash,
}

export const STATE_LABEL: Record<SubmissionState, string> = {
  todo: 'To do',
  skipped: 'Skipped',
  submitted: 'Submitted',
  verified: 'Verified',
  live: 'Live',
  rejected: 'Rejected',
}

export function StateTag({ state, className }: { state: SubmissionState; className?: string }) {
  const Icon = STATE_ICON[state]
  return (
    <Badge className={cn('gap-1 font-normal', STATE_TONE[state], className)}>
      <Icon className="size-3" />
      {STATE_LABEL[state]}
    </Badge>
  )
}

/** The backlink verdict, which is the only outcome the campaign is judged on. */
export function BacklinkTag({
  live,
  rel,
  checkedAt,
}: {
  live: boolean | null
  rel: string | null
  checkedAt: string | null
}) {
  if (!checkedAt) {
    return <span className="text-[13px] text-muted-foreground/60">not checked</span>
  }
  if (!live) {
    return (
      <Badge
        className="gap-1 border-transparent bg-bad/10 font-normal text-bad"
        title={`Checked ${checkedAt}`}
      >
        <Link2Off className="size-3" />
        No link
      </Badge>
    )
  }
  return (
    <Badge
      className={cn(
        'gap-1 font-normal',
        rel === 'dofollow'
          ? 'border-transparent bg-good/10 text-good'
          : 'border-transparent bg-muted text-muted-foreground',
      )}
      title={`Checked ${checkedAt}`}
    >
      <Link2 className="size-3" />
      {rel ?? 'live'}
    </Badge>
  )
}
