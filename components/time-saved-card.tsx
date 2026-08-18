import { Clock, Timer } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MANUAL_MINUTES, formatDuration, type TimeSaved } from '@/lib/timing'

/**
 * What the agent's clock adds up to.
 *
 * The saving is the only number on this screen that is an argument rather than
 * a count, so it shows its working: the manual rate is printed beside it, and
 * the agent's own time is subtracted rather than ignored. A card that just
 * said "you saved 4 hours" would be the same genre of claim as "submitted to
 * 300 sites", which is the thing this product was built to distrust.
 *
 * Untimed attempts are named rather than averaged in. Filling them with a mean
 * would inflate the total using rows nobody measured.
 */
export function TimeSavedCard({ time, attempted }: { time: TimeSaved; attempted: number }) {
  const untimed = Math.max(0, attempted - time.timed)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">What the agent saved you</CardTitle>
        <CardDescription>
          Measured on {time.timed} {time.timed === 1 ? 'attempt' : 'attempts'}, against{' '}
          {MANUAL_MINUTES} minutes a form by hand.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {time.timed === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Nothing timed yet. The clock starts when the agent runs{' '}
            <span className="text-foreground">submit begin</span> before a directory and stops when
            it reports the result, so the duration is measured here rather than reported.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Figure
                icon={Clock}
                label="Saved"
                value={formatDuration(time.savedMs)}
                tone="good"
              />
              <Figure icon={Timer} label="Agent time" value={formatDuration(time.agentMs)} />
              <Figure icon={Clock} label="By hand" value={formatDuration(time.manualMs)} />
            </div>

            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {time.timed} {time.timed === 1 ? 'form' : 'forms'} at {MANUAL_MINUTES} minutes each is{' '}
              <span className="text-foreground">{formatDuration(time.manualMs)}</span>. The agent
              spent <span className="text-foreground">{formatDuration(time.agentMs)}</span> of that.
              {untimed > 0 && (
                <>
                  {' '}
                  {untimed} other {untimed === 1 ? 'attempt is' : 'attempts are'} not counted here,
                  because {untimed === 1 ? 'it was' : 'they were'} never timed.
                </>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Figure({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock
  label: string
  value: string
  tone?: 'good'
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={tone === 'good' ? 'size-3.5 text-good' : 'size-3.5'} />
        {label}
      </span>
      <span
        className={
          tone === 'good'
            ? 'text-2xl font-semibold tabular-nums text-good'
            : 'text-2xl font-semibold tabular-nums'
        }
      >
        {value}
      </span>
    </div>
  )
}
