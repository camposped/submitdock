import Link from 'next/link'
import { Package } from 'lucide-react'

import { ScreenEmptyState } from '@/components/screen-empty-state'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'

/**
 * The frame every kit section shares: one heading, one line saying what the
 * section answers, and the content under it. Narrower than the dashboard's
 * column because the sub-rail already took 232px.
 */
export function KitSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Reveal
      from="up"
      duration={400}
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6 sm:p-8"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </Reveal>
  )
}

/** Every kit section needs a product, and none of them can invent one. */
export function NoProduct() {
  return (
    <div className="flex flex-1 flex-col p-6 sm:p-8">
      <ScreenEmptyState
        icon={Package}
        title="No product yet"
        description="A product is the kit of answers you paste into every directory form. Add one from the switcher at the top of the sidebar."
      >
        <Button size="sm" asChild>
          <Link href="/">Back to the dashboard</Link>
        </Button>
      </ScreenEmptyState>
    </div>
  )
}
