'use client'

import { ExternalLink } from 'lucide-react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { assetSrc } from '@/lib/asset-src'
import { blockerLabels } from '@/lib/blockers'
import { formatDuration } from '@/lib/timing'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { SUBMISSION_STATES } from '@/db/schema'
import { saveDirectoryDialog } from '@/lib/actions'
import { parseJsonArray } from '@/lib/domain'
import type { CatalogRow } from '@/lib/queries'
import { cn } from '@/lib/utils'

const STATE_OPTIONS = SUBMISSION_STATES.map((state) => ({ value: state, label: state }))

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save'}
    </Button>
  )
}

/** A labelled block of facts the crawler produced, which are read only here. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-[13px]">{children}</span>
    </div>
  )
}

/**
 * One directory, opened from its row.
 *
 * Everything editable about a domain lives here rather than in the table: the
 * catalog is 200+ rows and eleven columns of inline inputs was unreadable. The
 * split inside matters, because the two halves have different owners: the top
 * is the shared catalog, the bottom belongs to the selected product only.
 *
 * `tier` is deliberately not editable here. It is one person's ungraded
 * opinion carried by a minority of rows, and putting it beside the crawler's
 * facts made it read like one. `authorityScore` is the number that sorts the
 * catalog. Note that `lib/actions.ts` must therefore not write tier either: a
 * form that stops sending a field would otherwise null it on every save.
 */
export function DirectoryDialog({
  row,
  productSlug,
  productName,
  onClose,
}: {
  row: CatalogRow | null
  productSlug: string | null
  productName: string | null
  onClose: () => void
}) {
  if (!row) return null

  const submission = row.submission
  const target = row.submitUrl ?? `https://${row.domain}`

  // Shared with the submissions table, which used to build its own and say it
  // differently. See lib/blockers.ts.
  const blocks = blockerLabels(row)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/*
        A modal rather than the side sheet this used to be. The sheet was the
        wrong shape for what ended up in here: a screenshot of the page the
        agent finished on, a paragraph of playbook and a paragraph of note. A
        rail 384px wide turned the picture into a stamp and wrapped every
        sentence every six words, and it could not be widened, because the
        primitive pins it with `data-[side=right]:sm:max-w-sm`, a variant class
        that tailwind-merge does not treat as a conflict.

        Height is capped and the body scrolls, so a long playbook cannot push
        the save buttons off the bottom of the screen.
      */}
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="gap-1 border-b p-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="min-w-0 truncate">{row.domain}</span>
            <a
              href={target}
              target="_blank"
              rel="noreferrer"
              title={row.submitUrl ? `Submit form: ${row.submitUrl}` : 'No submit URL found yet'}
              className="shrink-0 cursor-pointer text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="size-4" />
            </a>
          </DialogTitle>
          <DialogDescription>
            {row.name ? `${row.name}. ` : ''}
            {row.submitUrl ? 'Submit form found.' : 'No submit form found yet.'}
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await saveDirectoryDialog(row.domain, productSlug, formData)
            onClose()
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Fact label="Status">
                <span
                  className={cn(
                    row.status === 'alive' && 'text-good',
                    row.status === 'blocked' && 'text-foreground',
                  )}
                >
                  {row.status}
                  {row.httpStatus ? ` · ${row.httpStatus}` : ''}
                </span>
              </Fact>
              <Fact label="Last probed">
                {row.lastCheckedAt || <span className="text-muted-foreground">never</span>}
              </Fact>
              <Fact label="Source">
                <span className="text-xs">{row.source.split(',').join(', ')}</span>
              </Fact>
              <div className="col-span-2 sm:col-span-3">
                <Fact label="Blocker">
                  {blocks.length > 0 ? (
                    blocks.join(', ')
                  ) : (
                    <span className="text-muted-foreground">nothing, the agent can do this one</span>
                  )}
                </Fact>
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t pt-4">
              <div>
                <h3 className="text-sm font-semibold">Curation</h3>
                <p className="text-xs text-muted-foreground">
                  Shared by every product, and never overwritten by a seed run.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    name="price"
                    inputMode="decimal"
                    defaultValue={row.price === null ? '' : String(row.price)}
                    placeholder={row.requiresPayment ? 'charges, amount unknown' : 'free'}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="categories">Categories</Label>
                <Input
                  id="categories"
                  name="categories"
                  defaultValue={parseJsonArray(row.categories).join(', ')}
                  placeholder="analytics, saas"
                />
                <p className="text-xs text-muted-foreground">Comma separated.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} defaultValue={row.notes ?? ''} />
                <p className="text-xs text-muted-foreground">Yours. Nothing overwrites this.</p>
              </div>
            </section>

            {/*
              Read only, and deliberately so. This is the agent's field report
              on the directory, and the way to change it is to submit again and
              learn something new, not to type over it here. It ships in the
              committed catalog, so it is also the one thing on this sheet a
              stranger cloning the repo inherits.
            */}
            {row.playbook && (
              <section className="flex flex-col gap-2 border-t pt-4">
                <div>
                  <h3 className="text-sm font-semibold">What the agent learned here</h3>
                  <p className="text-xs text-muted-foreground">
                    Written by the agent, carried to your next product, and shipped in the catalog.
                  </p>
                </div>
                <p className="rounded-lg border bg-muted/30 p-3 text-[13px] leading-relaxed whitespace-pre-wrap">
                  {row.playbook}
                </p>
              </section>
            )}

            {productSlug && (
              <section className="flex flex-col gap-3 border-t pt-4">
                <div>
                  <h3 className="text-sm font-semibold">{productName ?? productSlug}</h3>
                  <p className="text-xs text-muted-foreground">
                    This product only. Other products keep their own state for this domain.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Select
                    id="state"
                    name="state"
                    defaultValue={submission?.state ?? 'todo'}
                    options={STATE_OPTIONS}
                    aria-label="Submission state"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="listingUrl">Listing URL</Label>
                  <Input
                    id="listingUrl"
                    name="listingUrl"
                    defaultValue={submission?.listingUrl ?? ''}
                    placeholder="https://directory.com/tools/northwind"
                  />
                  <p className="text-xs text-muted-foreground">
                    The page the listing lives on. verify.ts reads this to check the backlink.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="submissionNotes">Submission notes</Label>
                  <Textarea
                    id="submissionNotes"
                    name="submissionNotes"
                    rows={2}
                    defaultValue={submission?.notes ?? ''}
                  />
                </div>

                {/*
                  The proof, and the clock. A "thanks for submitting" screen is
                  the only receipt most directories ever hand out, so the
                  picture is worth more here than any state the agent set: it
                  is the one thing on this sheet nobody could have typed in.
                */}
                {(submission?.screenshotPath || submission?.durationMs) && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">The attempt</span>
                      {submission.durationMs ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          took {formatDuration(submission.durationMs)}
                        </span>
                      ) : null}
                    </div>
                    {submission.screenshotPath && (
                      <a
                        href={assetSrc(submission.screenshotPath)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open the full screenshot"
                        className="cursor-pointer overflow-hidden rounded-lg border bg-muted/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- an absolute path off disk, served by /api/asset */}
                        <img
                          src={assetSrc(submission.screenshotPath)}
                          alt={`The last thing the agent saw on ${row.domain}`}
                          className="max-h-64 w-full object-cover object-top"
                        />
                      </a>
                    )}
                  </div>
                )}

                <Fact label="Backlink">
                  {!submission?.lastVerifiedAt ? (
                    <span className="text-muted-foreground">not checked yet</span>
                  ) : submission.backlinkLive ? (
                    <span className={submission.backlinkRel === 'dofollow' ? 'text-good' : undefined}>
                      {submission.backlinkRel ?? 'live'}, checked{' '}
                      {submission.lastVerifiedAt.slice(0, 10)}
                    </span>
                  ) : (
                    <span className="text-bad">
                      no link found, checked {submission.lastVerifiedAt.slice(0, 10)}
                    </span>
                  )}
                </Fact>
              </section>
            )}
          </div>

          <DialogFooter className="flex-row justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <SaveButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
