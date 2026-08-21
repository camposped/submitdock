'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowDown, ChevronRight, ExternalLink, Link2, Link2Off, SearchX } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { DirectoryDialog } from '@/components/directory-dialog'
import { ScreenEmptyState } from '@/components/screen-empty-state'
import { BlockSummary, ReachabilityTag } from '@/components/state-badge'
import { StateTag } from '@/components/submission-status'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CatalogRow } from '@/lib/queries'
import { cn } from '@/lib/utils'

export function CatalogTable({
  rows,
  productSlug,
  productName,
}: {
  rows: CatalogRow[]
  productSlug: string | null
  productName: string | null
}) {
  const [openDomain, setOpenDomain] = useState<string | null>(null)
  const open = rows.find((row) => row.domain === openDomain) ?? null

  if (rows.length === 0) {
    return (
      <div className="flex min-h-72">
        <ScreenEmptyState
          icon={SearchX}
          title="No directory matches"
          description="Nothing in the catalog fits these filters. Widen one, or clear them all to see the full 353."
        />
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Domain</TableHead>
              <TableHead className="w-20 text-center">
                <DrSortHeader />
              </TableHead>
              <TableHead className="w-16 text-center">
                <Explain label="Tier">
                  Your own grade of how much a link from here is worth, A to C. There is no
                  formula: it is an override on top of AS, set by hand in the row.
                </Explain>
              </TableHead>
              <TableHead className="w-32 text-center">
                <Explain label="Blocker">
                  What stops the agent finishing this one alone: a captcha, an account, a fee, a
                  demand for a link back, or a third party form. &ldquo;Open&rdquo; means nothing
                  is in the way.
                </Explain>
              </TableHead>
              <TableHead className="w-28">
                <Explain label="Link">
                  What this directory hands out, learned the first time any product verified a
                  link from it. Dofollow passes authority; nofollow does not.
                </Explain>
              </TableHead>
              {productSlug && (
                <TableHead className="w-28 text-center">
                  <Explain label="State">
                    Where this directory stands for the selected product only. Another product
                    keeps its own.
                  </Explain>
                </TableHead>
              )}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.domain}
                onClick={() => setOpenDomain(row.domain)}
                className={cn(
                  'cursor-pointer',
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-[13px] font-medium">{row.domain}</span>
                    <a
                      href={row.submitUrl ?? `https://${row.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      title={
                        row.submitUrl
                          ? `Submit form: ${row.submitUrl}`
                          : `No submit URL found yet, opening ${row.domain}`
                      }
                      className={cn(
                        'shrink-0 cursor-pointer',
                        row.submitUrl
                          ? 'text-muted-foreground hover:text-primary'
                          : 'text-muted-foreground/30 hover:text-muted-foreground',
                      )}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                    <ReachabilityTag status={row.status} httpStatus={row.httpStatus} />
                  </div>
                  {row.name && (
                    <span className="block truncate text-xs text-muted-foreground">{row.name}</span>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  <AuthorityCell score={row.authorityScore} />
                </TableCell>

                <TableCell className="text-center">
                  {row.tier ? (
                    <span className="text-[13px] font-medium uppercase">{row.tier}</span>
                  ) : (
                    <span className="text-[13px] text-muted-foreground/50">·</span>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  <BlockSummary
                    account={row.requiresAccount}
                    captcha={row.requiresCaptcha}
                    payment={row.requiresPayment}
                    backlink={row.requiresBacklink}
                    thirdParty={row.thirdPartyForm}
                  />
                </TableCell>

                <TableCell>
                  <LinkTypeCell rel={row.linkRel} />
                </TableCell>

                {productSlug && (
                  <TableCell className="text-center">
                    <StateTag state={row.submission?.state ?? 'todo'} />
                  </TableCell>
                )}

                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground/50" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DirectoryDialog
        row={open}
        productSlug={productSlug}
        productName={productName}
        onClose={() => setOpenDomain(null)}
      />
    </>
  )
}


/**
 * Semrush Authority Score, banded by colour.
 *
 * The number is what matters, so the bands are quiet: only the top one gets
 * ink, because "this is worth the effort" is the only judgement the column has
 * to make at a glance. Null is not zero and does not pretend to be.
 */
function AuthorityCell({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="text-[13px] text-muted-foreground/40" title="Nobody has rated this domain">
        not rated
      </span>
    )
  }
  return (
    <span
      className={cn(
        'text-[13px] tabular-nums',
        score >= 50 ? 'font-medium text-good' : score >= 30 ? 'text-foreground' : 'text-muted-foreground',
      )}
      title={`Semrush Authority Score ${score}`}
    >
      {score}
    </span>
  )
}

/** What the directory hands out, once any product has verified a link from it. */
function LinkTypeCell({ rel }: { rel: string | null }) {
  if (!rel) {
    return (
      <span
        className="text-[13px] text-muted-foreground/40"
        title="No link from this directory has been verified yet"
      >
        unknown
      </span>
    )
  }
  const dofollow = rel === 'dofollow'
  const Icon = dofollow ? Link2 : Link2Off
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[13px]',
        dofollow ? 'text-good' : 'text-muted-foreground',
      )}
      title={dofollow ? 'Passes authority' : 'Carries rel=nofollow, passes no authority'}
    >
      <Icon className="size-3" />
      {rel}
    </span>
  )
}

/** AS ranks by default; alphabetical is for hunting a specific domain. */
function DrSortHeader() {
  const pathname = usePathname()
  const params = useSearchParams()
  const byDr = params.get('sort') !== 'domain'

  const next = new URLSearchParams(params.toString())
  if (byDr) next.set('sort', 'domain')
  else next.delete('sort')
  const query = next.toString()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={query ? `${pathname}?${query}` : pathname}
          scroll={false}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1 hover:text-foreground',
            byDr && 'text-foreground',
          )}
        >
          AS
          <ArrowDown className={cn('size-3', byDr ? 'opacity-100' : 'opacity-30')} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
        Semrush Authority Score, 0 to 100: third party authority, the objective version of Tier. Click to
        {byDr ? ' sort alphabetically instead' : ' rank by it'}. Not every domain has been rated.
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * A column heading that says what its column means.
 *
 * Half the columns here are jargon the interface invented: Tier, Blocker, AS,
 * Link. A person should not have to ask someone what a header means, so the
 * answer travels with it under a dotted underline.
 */
function Explain({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help decoration-muted-foreground/40 underline-offset-4 hover:text-foreground hover:underline hover:decoration-dotted">
        {label}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
