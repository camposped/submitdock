/**
 * Domain normalization. Every path into `directories` goes through this, so
 * `https://WWW.SaaSHub.com/submit/` and `saashub.com` converge on one row
 * instead of quietly becoming two catalog entries.
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null

  let value = input.trim().toLowerCase()
  if (!value) return null

  // Markdown link leftovers and list bullets, since one source is a README.
  value = value.replace(/^[-*\s>|]+/, '').replace(/[)\],.;|]+$/, '')
  value = value.replace(/^<|>$/g, '')

  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
  value = value.split('/')[0]
  value = value.split('?')[0]
  value = value.split('#')[0]
  value = value.split('@').pop() ?? value
  value = value.split(':')[0]
  value = value.replace(/^www\./, '')
  value = value.replace(/\.$/, '')

  // A bare label with no dot is not a domain; neither is anything with a space.
  if (!value.includes('.') || /\s/.test(value)) return null
  if (!/^[a-z0-9.-]+$/.test(value)) return null
  if (value.startsWith('.') || value.endsWith('.')) return null

  const tld = value.split('.').pop() ?? ''
  if (tld.length < 2 || /^\d+$/.test(tld)) return null

  return value
}

/**
 * Sources are stored comma separated so a domain can carry more than one
 * origin. Both sides may already be lists, which is what makes re-importing an
 * export safe.
 */
export function mergeSources(existing: string | null | undefined, incoming: string | null | undefined): string {
  const split = (value: string | null | undefined) =>
    (value ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const parts = split(existing)
  for (const part of split(incoming)) {
    if (!parts.includes(part)) parts.push(part)
  }
  return parts.join(',')
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}
