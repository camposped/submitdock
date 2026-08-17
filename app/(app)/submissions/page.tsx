import Link from 'next/link'
import { Send } from 'lucide-react'

import { FilterTabs, type FilterTab } from '@/components/filter-tabs'
import { ScreenEmptyState } from '@/components/screen-empty-state'
import { SubmissionsTable } from '@/components/submissions-table'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { activeProduct } from '@/lib/product-selection'
import { listSubmissions, type SubmissionRow } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Submissions' }

/** The buckets worth separating, in the order a campaign moves through them. */
const VIEWS: Record<string, (row: SubmissionRow) => boolean> = {
  waiting: (row) => row.submission.state === 'submitted' || row.submission.state === 'verified',
  live: (row) => row.submission.state === 'live',
  confirmed: (row) => Boolean(row.submission.backlinkLive),
  // Matches what the "What happened" column will actually say: a stale verify
  // failure from before the listing URL changed is not a current problem.
  problem: (row) =>
    row.submission.state === 'rejected' ||
    row.submission.backlinkLive === false ||
    Boolean(
      row.lastEvent &&
        !row.lastEvent.ok &&
        !(row.lastEvent.action.startsWith('verify.') && !row.submission.lastVerifiedAt),
    ),
  skipped: (row) => row.submission.state === 'skipped',
}

export default async function SubmissionsPage(props: PageProps<'/submissions'>) {
  const searchParams = await props.searchParams
  const raw = searchParams.view
  const view = (Array.isArray(raw) ? raw[0] : raw) ?? ''

  const product = await activeProduct()
  const all = listSubmissions(product?.slug ?? null)

  const count = (key: string) => all.filter(VIEWS[key]).length
  const tabs: FilterTab[] = [
    { value: '', label: 'All', count: all.length },
    { value: 'waiting', label: 'Waiting', count: count('waiting'), tone: 'info' },
    { value: 'live', label: 'Live', count: count('live'), tone: 'good' },
    { value: 'confirmed', label: 'Link confirmed', count: count('confirmed'), tone: 'good' },
    { value: 'problem', label: 'Problem', count: count('problem'), tone: 'bad' },
    { value: 'skipped', label: 'Skipped', count: count('skipped') },
  ]

  const rows = VIEWS[view] ? all.filter(VIEWS[view]) : all

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <Reveal
        from="up"
        duration={400}
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-6 sm:p-8"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
          <p className="text-sm text-muted-foreground">
            Every directory {product ? product.name : 'this product'} was actually sent to, what
            came of it, and why. Open a row to change the state or leave a note.
          </p>
        </div>

        {all.length === 0 ? (
          <ScreenEmptyState
            icon={Send}
            title="Nothing sent yet"
            description="A directory lands here the moment you mark it submitted or paste a listing URL. The catalog is where you pick the next one."
          >
            <Button size="sm" asChild>
              <Link href="/catalog?view=ready">Find one to send</Link>
            </Button>
          </ScreenEmptyState>
        ) : (
          <>
            <FilterTabs param="view" tabs={tabs} />
            {rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nothing in this view yet.
              </p>
            ) : (
              <SubmissionsTable
                rows={rows}
                productSlug={product!.slug}
                productName={product!.name}
              />
            )}
          </>
        )}
      </Reveal>
    </div>
  )
}
