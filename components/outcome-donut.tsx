import { CircleCheck, CircleSlash, Clock, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type OutcomeSlice = {
  key: string
  label: string
  count: number
  /** Extra line under the label, e.g. how many of the confirmed are dofollow. */
  note?: string
  fill: string
  text: string
  icon: LucideIcon
}

/**
 * What became of everything you sent, as one ring.
 *
 * The slices are mutually exclusive on purpose. The funnel this replaces showed
 * nested stages (submitted contains live contains confirmed), which is fine as
 * bars and impossible as a pie: four submissions would have drawn nine slices.
 * The nesting still gets read out, as the conversion line under the ring.
 *
 * Colours come from the --outcome-* tokens, which are stepped for a chart and
 * validated for colour-vision separation in both themes. Identity is never
 * carried by colour alone: every slice has an icon and a label in the legend.
 */
export function OutcomeDonut({
  slices,
  total,
  headline,
  headlineLabel,
  footnote,
}: {
  slices: OutcomeSlice[]
  total: number
  headline: number
  headlineLabel: string
  footnote?: string
}) {
  const present = slices.filter((slice) => slice.count > 0)

  // Geometry: a 2px gap of surface between segments, per the mark spec, done
  // with a dash pattern rather than by shortening arcs, so the gap stays 2px
  // whatever the slice sizes are.
  const size = 168
  const stroke = 22
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const gap = present.length > 1 ? 3 : 0

  // Each arc starts where the ones before it ended. Derived from the slices
  // ahead of time rather than accumulated in a mutable counter, so the render
  // stays a pure function of the props.
  const lengths = present.map((slice) => (slice.count / Math.max(total, 1)) * circumference)
  const arcs = present.map((slice, index) => ({
    slice,
    length: lengths[index],
    offset: lengths.slice(0, index).reduce((sum, value) => sum + value, 0),
  }))

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0 self-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          {arcs.map(({ slice, length, offset }) => {
            const dash = Math.max(length - gap, 1)
            return (
              <circle
                key={slice.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                stroke={slice.fill}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                // Rotated so the ring starts at twelve o'clock and reads clockwise.
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              >
                <title>{`${slice.label}: ${slice.count} of ${total}`}</title>
              </circle>
            )
          })}
        </svg>

        {/* The hero number sits in the hole, which is what the hole is for. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl leading-none font-semibold tabular-nums">{headline}</span>
          <span className="mt-1 max-w-24 text-center text-[11px] leading-tight text-muted-foreground">
            {headlineLabel}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {slices.map((slice) => {
          const share = total > 0 ? Math.round((slice.count / total) * 100) : 0
          return (
            <div key={slice.key} className="flex items-start gap-2.5">
              <slice.icon className={cn('mt-0.5 size-4 shrink-0', slice.text)} />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium">{slice.label}</span>
                  <span className="text-[13px] tabular-nums text-muted-foreground">
                    {slice.count}
                  </span>
                  {total > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground/70">{share}%</span>
                  )}
                </div>
                {slice.note && (
                  <span className="text-xs text-muted-foreground">{slice.note}</span>
                )}
              </div>
            </div>
          )
        })}

        {footnote && <p className="mt-1 border-t pt-3 text-xs text-muted-foreground">{footnote}</p>}
      </div>
    </div>
  )
}

/** The three outcomes, in the order the ring draws them. */
export function outcomeSlices({
  confirmed,
  dofollow,
  waiting,
  failed,
}: {
  confirmed: number
  dofollow: number
  waiting: number
  failed: number
}): OutcomeSlice[] {
  return [
    {
      key: 'confirmed',
      label: 'Link confirmed',
      count: confirmed,
      note:
        confirmed > 0
          ? `${dofollow} dofollow, ${confirmed - dofollow} nofollow`
          : 'The only outcome that moves domain authority',
      fill: 'var(--outcome-confirmed)',
      text: 'text-outcome-confirmed',
      icon: CircleCheck,
    },
    {
      key: 'waiting',
      label: 'Waiting',
      count: waiting,
      note: 'Sent, nothing confirmed yet',
      fill: 'var(--outcome-waiting)',
      text: 'text-outcome-waiting',
      icon: Clock,
    },
    {
      key: 'failed',
      label: 'Dead end',
      count: failed,
      note: 'Rejected, or the listing carries no link',
      fill: 'var(--outcome-failed)',
      text: 'text-outcome-failed',
      icon: CircleSlash,
    },
  ]
}
