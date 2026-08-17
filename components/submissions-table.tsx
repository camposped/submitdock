'use client'

import { useState } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'

import { DirectorySheet } from '@/components/directory-sheet'
import { BacklinkTag, StateTag } from '@/components/submission-status'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { eventLabel } from '@/lib/event-labels'
import type { SubmissionRow } from '@/lib/queries'
import { cn } from '@/lib/utils'

/**
 * What happened, in one line.
 *
 * Reads the verdict first, because a confirmed link ends the story. Otherwise
 * it falls back to the last thing a script reported, which is where an "HTTP
 * 403" or a timeout comes from, and finally to the note you left by hand.
 */
function outcomeOf(row: SubmissionRow): { text: string; tone: 'good' | 'bad' | 'muted' } {
  const s = row.submission

  if (s.lastVerifiedAt && s.backlinkLive) {
    return { text: `Link confirmed, ${s.backlinkRel ?? 'live'}`, tone: 'good' }
  }
  if (s.lastVerifiedAt && s.backlinkLive === false) {
    return { text: 'Listing page has no link to the product', tone: 'bad' }
  }

  // A verify event only describes the current state while a verdict stands. Once
  // the listing URL changes the verdict is cleared, and the old failure with it,
  // otherwise a row would keep reporting a problem that was already dealt with.
  const event = row.lastEvent
  const stale = event?.action.startsWith('verify.') && !s.lastVerifiedAt
  if (event && !event.ok && !stale) {
    let detail: Record<string, unknown> = {}
    try {
      detail = JSON.parse(event.detail) as Record<string, unknown>
    } catch {}
    const status = detail.status ? `HTTP ${String(detail.status)}` : null
    const error = typeof detail.error === 'string' ? detail.error : null
    const said = [status, error].filter(Boolean).join(', ')
    // Never surface a raw action name: it is a database value, not a sentence.
    return { text: said ? `Could not be read, ${said}` : eventLabel(event.action), tone: 'bad' }
  }

  if (s.notes) return { text: s.notes, tone: 'muted' }
  if (!s.listingUrl && s.state === 'submitted') {
    return { text: 'Sent, no listing URL pasted yet', tone: 'muted' }
  }
  if (s.listingUrl && !s.lastVerifiedAt) {
    return { text: 'Listing URL saved, run verify to check the link', tone: 'muted' }
  }
  return { text: '', tone: 'muted' }
}

function daysSince(iso: string | null) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'today'
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export function SubmissionsTable({
  rows,
  productSlug,
  productName,
}: {
  rows: SubmissionRow[]
  productSlug: string
  productName: string
}) {
  const [openDomain, setOpenDomain] = useState<string | null>(null)
  const open = rows.find((row) => row.domain === openDomain) ?? null

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[26%]">Directory</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Backlink</TableHead>
              <TableHead>What happened</TableHead>
              <TableHead className="w-28">Sent</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const outcome = outcomeOf(row)
              return (
                <TableRow
                  key={row.domain}
                  onClick={() => setOpenDomain(row.domain)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-[13px] font-medium">{row.domain}</span>
                      <a
                        href={row.submission.listingUrl ?? row.submitUrl ?? `https://${row.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        title={
                          row.submission.listingUrl
                            ? `Listing: ${row.submission.listingUrl}`
                            : `Open ${row.domain}`
                        }
                        className={cn(
                          'shrink-0 cursor-pointer',
                          row.submission.listingUrl
                            ? 'text-muted-foreground hover:text-primary'
                            : 'text-muted-foreground/30 hover:text-muted-foreground',
                        )}
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                    {row.tier && (
                      <span className="text-xs text-muted-foreground">Tier {row.tier.toUpperCase()}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <StateTag state={row.submission.state} />
                  </TableCell>

                  <TableCell>
                    <BacklinkTag
                      live={row.submission.backlinkLive}
                      rel={row.submission.backlinkRel}
                      checkedAt={row.submission.lastVerifiedAt}
                    />
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        'line-clamp-2 text-[13px]',
                        outcome.tone === 'good' && 'text-good',
                        outcome.tone === 'bad' && 'text-bad',
                        outcome.tone === 'muted' && 'text-muted-foreground',
                      )}
                      title={outcome.text}
                    >
                      {outcome.text || 'Nothing recorded yet'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-[13px] text-muted-foreground">
                      {daysSince(row.submission.submittedAt) ?? 'not sent'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground/50" />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <DirectorySheet
        row={open}
        productSlug={productSlug}
        productName={productName}
        onClose={() => setOpenDomain(null)}
      />
    </>
  )
}
