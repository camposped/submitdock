import Link from 'next/link'
import { ScrollText } from 'lucide-react'

import { EventFeed } from '@/components/event-feed'
import { ScreenEmptyState } from '@/components/screen-empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Reveal } from '@/components/ui/reveal'
import { activeProduct } from '@/lib/product-selection'
import { listEvents } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Agent Log' }

export default async function AgentLogPage() {
  const product = await activeProduct()
  const events = listEvents(200, product?.slug ?? null)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <Reveal
        from="up"
        duration={400}
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-6 sm:p-8"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agent Log</h1>
          <p className="text-sm text-muted-foreground">
            Raw record of every write a script or a click made. Submissions summarises this per
            directory; come here when a number looks wrong and you want to see what actually ran.
          </p>
        </div>

        {events.length === 0 ? (
          <ScreenEmptyState
            icon={ScrollText}
            title="Nothing logged yet"
            description="Seeds, probes, verifications and edits all land here."
          >
            <Button size="sm" asChild>
              <Link href="/catalog">Open the catalog</Link>
            </Button>
          </ScreenEmptyState>
        ) : (
          <Card>
            <CardContent>
              <EventFeed events={events} />
            </CardContent>
          </Card>
        )}
      </Reveal>
    </div>
  )
}
