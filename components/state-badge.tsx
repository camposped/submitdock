import { ShieldAlert, Unplug } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { DirectoryStatus } from '@/db/schema'
import { cn } from '@/lib/utils'

/**
 * Whether the domain answered the last probe, shown only when it did not.
 *
 * This used to be a coloured dot on every row, which told you nothing: 333 of
 * the 353 are alive, so the dot was lit and mute nine rows in ten, and the one
 * row that needed attention looked the same size as the rest. Marking only the
 * exception makes it findable and gives the other 333 their space back.
 */
export function ReachabilityTag({
  status,
  httpStatus,
}: {
  status: DirectoryStatus
  httpStatus: number
}) {
  if (status === 'alive') return null

  const blocked = status === 'blocked'
  const Icon = blocked ? ShieldAlert : Unplug

  return (
    <Badge
      variant="secondary"
      className={cn(
        'shrink-0 gap-1 font-normal',
        blocked ? 'bg-muted text-muted-foreground' : 'bg-bad/10 text-bad',
      )}
      title={
        blocked
          ? `Answered with HTTP ${httpStatus}, so something is refusing robots. The form may still work in a browser.`
          : 'Did not answer the last probe at all. Probably gone.'
      }
    >
      <Icon className="size-3" />
      {blocked ? 'Blocks bots' : 'Dead'}
    </Badge>
  )
}

/**
 * Two names per blocker: the short one the row shows, and the sentence the
 * tooltip spells out. Derived labels are not worth it, "Charges to list"
 * shortened by rule became "list".
 */
const BLOCKS = [
  { key: 'captcha', short: 'captcha', long: 'Captcha' },
  { key: 'account', short: 'account', long: 'Needs an account' },
  { key: 'payment', short: 'paid', long: 'Charges to list' },
  { key: 'backlink', short: 'reciprocal', long: 'Wants a link back' },
  { key: 'thirdParty', short: 'third party', long: 'Third party form' },
] as const

/**
 * What stops the agent, as words rather than initials. The catalog only shows
 * the first one plus a count, because the row needs a hint and the sheet has
 * the full list.
 */
export function BlockSummary({
  account,
  captcha,
  payment,
  backlink,
  thirdParty,
}: {
  account: boolean
  captcha: boolean
  payment: boolean
  backlink: boolean
  thirdParty: boolean
}) {
  const on = { captcha, account, payment, backlink, thirdParty }
  const hit = BLOCKS.filter((block) => on[block.key])

  // Nothing in the way is the normal case, so it says nothing. The column
  // exists to surface the exception, same reasoning as the reachability tag.
  if (hit.length === 0) return null

  return (
    <span className="text-[13px]" title={hit.map((block) => block.long).join(', ')}>
      {hit[0].short}
      {hit.length > 1 && <span className="text-muted-foreground"> +{hit.length - 1}</span>}
    </span>
  )
}
