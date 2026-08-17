'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SUBMISSION_STATES } from '@/db/schema'
import { cn } from '@/lib/utils'

const REQUIRE_FLAGS = [
  { value: 'account', label: 'Account' },
  { value: 'captcha', label: 'Captcha' },
  { value: 'payment', label: 'Paid' },
  { value: 'backlink', label: 'Reciprocal' },
  { value: 'thirdPartyForm', label: 'Third party form' },
] as const

export function CatalogFilters({
  hasProduct,
  shown,
  total,
}: {
  hasProduct: boolean
  shown: number
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [query, setQuery] = useState(params.get('q') ?? '')

  // The URL is the state, so a filtered view can be linked to and bookmarked.
  function apply(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString())
    mutate(next)
    router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname, { scroll: false })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((params.get('q') ?? '') === query) return
      apply((next) => (query ? next.set('q', query) : next.delete('q')))
    }, 200)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const requires = params.getAll('requires')
  const anyFilter = [...params.keys()].length > 0

  const set = (key: string) => (value: string) =>
    apply((next) => (value ? next.set(key, value) : next.delete(key)))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search domain, name, notes"
            className="h-9 pl-8"
          />
        </div>

        <Select
          className="h-9 w-36"
          aria-label="Status"
          value={params.get('status') ?? ''}
          onValueChange={set('status')}
          options={[
            { value: '', label: 'Any status' },
            { value: 'alive', label: 'Alive' },
            { value: 'blocked', label: 'Blocked' },
            { value: 'dead', label: 'Dead' },
          ]}
        />

        <Select
          className="h-9 w-32"
          aria-label="Tier"
          value={params.get('tier') ?? ''}
          onValueChange={set('tier')}
          options={[
            { value: '', label: 'Any tier' },
            { value: 'a', label: 'Tier A' },
            { value: 'b', label: 'Tier B' },
            { value: 'c', label: 'Tier C' },
            { value: 'none', label: 'Ungraded' },
          ]}
        />

        <Select
          className="h-9 w-40"
          aria-label="Submit URL"
          value={params.get('submitUrl') ?? ''}
          onValueChange={set('submitUrl')}
          options={[
            { value: '', label: 'Any form' },
            { value: 'yes', label: 'Has submit URL' },
            { value: 'no', label: 'No submit URL' },
          ]}
        />

        <Select
          className="h-9 w-36"
          aria-label="Domain Rating"
          value={params.get('dr') ?? ''}
          onValueChange={set('dr')}
          options={[
            { value: '', label: 'Any DR' },
            { value: '80', label: 'DR 80+' },
            { value: '60', label: 'DR 60+' },
            { value: '40', label: 'DR 40+' },
            { value: '20', label: 'DR 20+' },
            { value: 'none', label: 'Not rated' },
          ]}
        />

        <Select
          className="h-9 w-40"
          aria-label="Link type"
          value={params.get('linkRel') ?? ''}
          onValueChange={set('linkRel')}
          options={[
            { value: '', label: 'Any link type' },
            { value: 'dofollow', label: 'Gives dofollow' },
            { value: 'nofollow', label: 'Gives nofollow' },
            { value: 'unknown', label: 'Link type unknown' },
          ]}
        />

        {hasProduct && (
          <Select
            className="h-9 w-36"
            aria-label="State"
            value={params.get('state') ?? ''}
            onValueChange={set('state')}
            options={[
              { value: '', label: 'Any state' },
              ...SUBMISSION_STATES.map((state) => ({ value: state, label: state })),
            ]}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Requires</span>
        {REQUIRE_FLAGS.map((flag) => {
          const on = requires.includes(flag.value)
          return (
            <button
              key={flag.value}
              type="button"
              aria-pressed={on}
              onClick={() =>
                apply((next) => {
                  const kept = requires.filter((value) => value !== flag.value)
                  next.delete('requires')
                  for (const value of on ? kept : [...kept, flag.value]) next.append('requires', value)
                })
              }
              className={cn(
                'cursor-pointer rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                on
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
              )}
            >
              {flag.label}
            </button>
          )
        })}

        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {shown === total ? `${total} directories` : `${shown} of ${total} directories`}
        </span>

        {anyFilter && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              router.replace(pathname, { scroll: false })
            }}
            className="cursor-pointer text-xs font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
