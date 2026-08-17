import Link from 'next/link'
import { Hand, Link2, Radio, Rocket, Send, Signal, type LucideIcon } from 'lucide-react'

import { HowItWorks } from '@/components/how-it-works'
import { OutcomeDonut, outcomeSlices } from '@/components/outcome-donut'
import { ScreenEmptyState } from '@/components/screen-empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Reveal } from '@/components/ui/reveal'
import { cn } from '@/lib/utils'
import { activeProduct } from '@/lib/product-selection'
import { countNeedsHuman, getCampaignStats } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const product = await activeProduct()
  const stats = getCampaignStats(product?.slug ?? null)
  const needsYou = product ? countNeedsHuman(product.slug) : 0

  const submitted = stats.submitted + stats.verified + stats.live


  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
    <Reveal
      from="up"
      duration={400}
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6 sm:p-8"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {product
            ? `How far ${product.name} got. ${stats.worked} of ${stats.catalogTotal} directories touched so far.`
            : 'Add a product to start tracking submissions against the catalog.'}
        </p>
      </div>

      {/* Open while there is nothing to look at, which is the only time the
          explanation is what you came for. It collapses to one line after that. */}
      <HowItWorks open={stats.attempted === 0} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={Send} label="Submitted" value={submitted} />
        <StatTile icon={Signal} label="Listings live" value={stats.live} />
        <StatTile
          icon={Link2}
          label="Backlinks confirmed"
          value={stats.backlinksLive}
          tone="good"
          note={stats.dofollow > 0 ? `${stats.dofollow} dofollow` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Where the links actually are</CardTitle>
          <CardDescription>
            Counting submissions is the easy number. This is the one that says whether the campaign
            worked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.attempted === 0 ? (
            <p className="py-6 text-[13px] text-muted-foreground">
              Nothing submitted yet. Open the{' '}
              <Link
                href="/catalog?view=ready"
                className="cursor-pointer font-medium text-primary hover:underline"
              >
                {stats.readyToSend} directories that are ready to send
              </Link>{' '}
              and mark each one as you go.
            </p>
          ) : (
            <OutcomeDonut
              slices={outcomeSlices({
                confirmed: stats.backlinksLive,
                dofollow: stats.dofollow,
                waiting: stats.waiting,
                failed: stats.deadEnd,
              })}
              total={stats.attempted}
              headline={stats.backlinksLive}
              headlineLabel={stats.backlinksLive === 1 ? 'link earned' : 'links earned'}
              footnote={
                submitted > 0
                  ? `${Math.round((stats.live / submitted) * 100)}% of what you sent went live, and ` +
                    `${stats.live > 0 ? Math.round((stats.backlinksLive / stats.live) * 100) : 0}% of those carry a real link.`
                  : undefined
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">What to do next</CardTitle>
          <CardDescription>
            The two piles that move the number above.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <NextPile
            href="/catalog?view=ready"
            icon={Rocket}
            label="Ready to send"
            value={stats.readyToSend}
            hint="Alive, an open form, and nothing stopping the agent."
            tone="good"
          />
          <NextPile
            href="/catalog?view=needs-you"
            icon={Hand}
            label="Needs you"
            value={needsYou}
            hint="Captcha, an account or a fee is in the way."
            tone="info"
          />
        </CardContent>
      </Card>

      {!product && (
        <Card>
          <CardContent className="flex min-h-64">
            <ScreenEmptyState
              icon={Radio}
              title="No product selected"
              description="The catalog is shared, but submission state belongs to a product. Add one to begin."
            >
              <Button size="sm" asChild>
                <Link href="/product">Add a product</Link>
              </Button>
            </ScreenEmptyState>
          </CardContent>
        </Card>
      )}
    </Reveal>
    </div>
  )
}

/**
 * A headline number with the icon that names it. The icon is the fastest way
 * to tell three same-shaped tiles apart at a glance, which is the whole job of
 * a KPI row.
 */
function StatTile({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  note?: string
  tone?: 'good'
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className={cn('size-3.5', tone === 'good' ? 'text-good' : 'text-muted-foreground')} />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {value}
          {note && <span className="ml-2 text-sm font-normal text-good">{note}</span>}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

/** One of the two piles of work, as a tile you click to go do it. */
function NextPile({
  href,
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  href: string
  icon: LucideIcon
  label: string
  value: number
  hint: string
  tone: 'good' | 'info'
}) {
  return (
    <Link
      href={href}
      className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50"
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md',
          tone === 'good' ? 'bg-good/10 text-good' : 'bg-info/10 text-info',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-2xl leading-none tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </Link>
  )
}
