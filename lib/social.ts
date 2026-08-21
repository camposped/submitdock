import type { Product } from '@/db/schema'

/**
 * The product's social profiles.
 *
 * Stored as handles, shown as both. Directory forms are split roughly down the
 * middle on whether they want `@kometrics` or the full URL, and the handle is
 * the half you cannot recover from the other: every network spells its path
 * differently, and some allow a path segment that is not the handle at all. So
 * the field keeps the handle and the URL is derived.
 *
 * LinkedIn is the exception that proves it. A company page and a person live at
 * different paths, and pasting a company URL into a field expecting a person
 * silently points at nothing. `path` carries that.
 */
export type SocialNetwork = {
  field: SocialField
  label: string
  /** What goes before the handle, including any path segment the network needs. */
  base: string
  hint?: string
}

export type SocialField = 'x' | 'youtube' | 'instagram' | 'facebook' | 'linkedin' | 'github'

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { field: 'x', label: 'X', base: 'https://x.com/' },
  {
    field: 'youtube',
    label: 'YouTube',
    base: 'https://youtube.com/@',
    hint: 'the @handle, not the channel id',
  },
  { field: 'instagram', label: 'Instagram', base: 'https://instagram.com/' },
  { field: 'facebook', label: 'Facebook', base: 'https://facebook.com/' },
  {
    field: 'linkedin',
    label: 'LinkedIn',
    base: 'https://linkedin.com/company/',
    hint: 'company page, not a person',
  },
  { field: 'github', label: 'GitHub', base: 'https://github.com/' },
]

/**
 * Turns anything someone pastes into a bare handle.
 *
 * People paste the full URL as often as the handle, and both have to work:
 * asking someone to strip a URL by hand is the sort of small tax that makes a
 * kit go unfilled.
 */
export function toHandle(raw: string): string {
  let value = raw.trim()
  if (!value) return ''

  value = value.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  // Drop the host and any leading path segment a network uses (company/, in/, c/).
  if (value.includes('/')) {
    const parts = value.split('/').filter(Boolean)
    const skip = new Set(['company', 'in', 'c', 'channel', 'user', 'pages'])
    const kept = parts.slice(1).filter((p) => !skip.has(p.toLowerCase()))
    value = kept[0] ?? ''
  }
  return value.replace(/^@+/, '').split('?')[0].trim()
}

/** The canonical URL for a handle, or empty when there is no handle. */
export function socialUrl(network: SocialNetwork, handle: string): string {
  const clean = toHandle(handle)
  return clean ? `${network.base}${clean}` : ''
}

/** Every profile that is actually filled in, ready to paste into a form. */
export function filledSocials(product: Product) {
  return SOCIAL_NETWORKS.map((network) => ({
    network,
    handle: product[network.field],
    url: socialUrl(network, product[network.field]),
  })).filter((entry) => entry.handle)
}
