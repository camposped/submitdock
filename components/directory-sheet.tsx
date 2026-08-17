'use client'

import { ExternalLink } from 'lucide-react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { SUBMISSION_STATES } from '@/db/schema'
import { saveDirectorySheet } from '@/lib/actions'
import { parseJsonArray } from '@/lib/domain'
import type { CatalogRow } from '@/lib/queries'
import { cn } from '@/lib/utils'

const TIER_OPTIONS = [
  { value: '', label: 'Ungraded' },
  { value: 'a', label: 'Tier A' },
  { value: 'b', label: 'Tier B' },
  { value: 'c', label: 'Tier C' },
]

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
 * catalog is 367 rows and eleven columns of inline inputs was unreadable. The
 * split inside matters, because the two halves have different owners: the top
 * is the shared catalog, the bottom belongs to the selected product only.
 */
export function DirectorySheet({
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

  const blocks = [
    row.requiresAccount && 'account',
    row.requiresCaptcha && `captcha${row.captchaVendor ? ` (${row.captchaVendor})` : ''}`,
    row.requiresPayment && 'payment',
    row.requiresBacklink && 'reciprocal link',
    row.thirdPartyForm && 'third party form',
  ].filter(Boolean) as string[]

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="gap-1 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
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
          </SheetTitle>
          <SheetDescription>
            {row.name ? `${row.name}. ` : ''}
            {row.submitUrl ? 'Submit form found.' : 'No submit form found yet.'}
          </SheetDescription>
        </SheetHeader>

        <form
          action={async (formData) => {
            await saveDirectorySheet(row.domain, productSlug, formData)
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
                    row.status === 'dead' && 'text-bad',
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
                  <Label htmlFor="tier">Tier</Label>
                  <Select
                    id="tier"
                    name="tier"
                    defaultValue={row.tier ?? ''}
                    options={TIER_OPTIONS}
                    aria-label="Tier"
                  />
                </div>
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
              </div>
            </section>

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

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <SaveButton />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
