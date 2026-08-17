import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * The one empty screen, shared by every page that can have nothing to show.
 *
 * The wrapper is flex-1 on purpose: pages are flex columns that fill the
 * viewport, so the card centers in whatever space the page header leaves
 * instead of hugging it. The pb-10 lifts the card slightly above the
 * geometric center, which is where a lone card reads as centered.
 */
export function ScreenEmptyState({
  icon: Icon,
  iconClass,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  /** Overrides the muted default, e.g. the all-clear emerald on Risk Radar. */
  iconClass?: string
  title: string
  description: string
  /** The CTA row; omitted when the state needs no action. */
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center justify-items-center">
          <Icon className={cn('mb-2 size-8', iconClass ?? 'text-muted-foreground')} />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
      </Card>
    </div>
  )
}
