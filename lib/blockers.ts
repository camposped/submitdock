import type { CatalogRow } from '@/lib/queries'

/**
 * What stops the agent finishing a form by itself, as words.
 *
 * One list, because the dialog and the submissions table were each building
 * their own and had already drifted: the dialog named the captcha vendor and
 * the table named nothing at all. A blocker is the reason a row is parked, so
 * the two places that park rows have to agree on how to say it.
 *
 * Ordered by who has to act. An account and a captcha need a person, a fee
 * needs a decision, a reciprocal link needs a change to your own site.
 */
export const BLOCKER_FLAGS = [
  { value: 'account', label: 'account' },
  { value: 'captcha', label: 'captcha' },
  { value: 'payment', label: 'paid' },
  { value: 'backlink', label: 'reciprocal link' },
  { value: 'thirdPartyForm', label: 'third party form' },
] as const

export type BlockerFlag = (typeof BLOCKER_FLAGS)[number]['value']

export function blockersOf(row: {
  requiresAccount: boolean
  requiresCaptcha: boolean
  requiresPayment: boolean
  requiresBacklink: boolean
  thirdPartyForm: boolean
  captchaVendor?: string | null
}): BlockerFlag[] {
  const out: BlockerFlag[] = []
  if (row.requiresAccount) out.push('account')
  if (row.requiresCaptcha) out.push('captcha')
  if (row.requiresPayment) out.push('payment')
  if (row.requiresBacklink) out.push('backlink')
  if (row.thirdPartyForm) out.push('thirdPartyForm')
  return out
}

const LABELS = new Map(BLOCKER_FLAGS.map((f) => [f.value, f.label]))

/** The same list as prose, with the captcha vendor when we know it. */
export function blockerLabels(row: Parameters<typeof blockersOf>[0]): string[] {
  return blockersOf(row).map((flag) =>
    flag === 'captcha' && row.captchaVendor
      ? `captcha (${row.captchaVendor})`
      : (LABELS.get(flag) ?? flag),
  )
}

/** Does this row need a person before anything else can happen? */
export function needsAPerson(row: CatalogRow) {
  return row.requiresAccount || row.requiresCaptcha
}
