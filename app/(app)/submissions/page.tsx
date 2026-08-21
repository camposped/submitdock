import Link from 'next/link'
import { Send } from 'lucide-react'

import { FilterTabs, type FilterTab } from '@/components/filter-tabs'
import { ScreenEmptyState } from '@/components/screen-empty-state'
import { SubmissionsTable } from '@/components/submissions-table'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { blockersOf } from '@/lib/blockers'
import { activeProduct } from '@/lib/product-selection'
import { listSubmissions, type SubmissionRow } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Submissions' }

/** The buckets worth separating, in the order a campaign moves through them. */
const VIEWS: Record<string, (row: SubmissionRow) => boolean> = {
  /*
   * The queue of things the agent started and could not finish: a captcha, a
   * signup, a button that only answers to a human hand. It is `todo` because
   * nothing was submitted, and it is here because somebody has to go back and
   * do it. Every one of these rows carries a note saying exactly what is left.
   */
  yourTurn: (row) => row.submission.state === 'todo',
  /*
   * The same queue split by what it costs you, because the work does not mix.
   * Creating three accounts is one sitting with a password manager open;
   * solving a captcha is a different one. A single "Your turn" pile makes you
   * re-read every note to sort them yourself.
   */
  needsAccount: (row) =>
    row.submission.state === 'todo' && blockersOf(row).includes('account'),
  needsCaptcha: (row) =>
    row.submission.state === 'todo' && blockersOf(row).includes('captcha'),
  waiting: (row) => row.submission.state === 'submitted' || row.submission.state === 'verified',
  live: (row) => row.submission.state === 'live',
  confirmed: (row) => Boolean(row.submission.backlinkLive),
  // Matches what the "What happened" column will actually say: a stale verify
  // failure from before the listing URL changed is not a current problem, and
  // neither is the agent's own sign off. `submission.done` is flagged not ok
  // for every state that is not submitted or live, so without that last clause
  // a deliberate skip and a row parked for a human both counted as problems
  // and this tab disagreed with the column beside it.
  problem: (row) =>
    row.submission.state === 'rejected' ||
    row.submission.backlinkLive === false ||
    Boolean(
      row.lastEvent &&
        !row.lastEvent.ok &&
        row.lastEvent.action !== 'submission.done' &&
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
    { value: 'yourTurn', label: 'Your turn', count: count('yourTurn'), tone: 'info' },
    ...(count('needsAccount') > 0
      ? [{ value: 'needsAccount', label: 'Needs an account', count: count('needsAccount') }]
      : []),
    ...(count('needsCaptcha') > 0
      ? [{ value: 'needsCaptcha', label: 'Needs a captcha', count: count('needsCaptcha') }]
      : []),
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
            Every directory {product ? product.name : 'this product'} was worked on, what came of
            it, and why. "Your turn" is the ones the agent could not finish alone. Open a row to
            change the state or leave a note.
          </p>
        </div>

        {all.length === 0 ? (
          <ScreenEmptyState
            icon={Send}
            title="Nothing sent yet"
            description="A directory lands here the moment you mark it submitted or paste a listing URL. The catalog is where you pick the next one."
          >
            <Button size="sm" asChild>
              <Link href="/catalog?status=alive&submitUrl=yes&blocker=none&state=todo">Find one to send</Link>
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
