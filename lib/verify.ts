import type { BacklinkRel } from '@/db/schema'

export type BacklinkMatch = {
  /** The exact href on the page that pointed at the product. */
  href: string
  rel: BacklinkRel
  /** The raw rel attribute, kept so a `ugc`/`sponsored` call can be audited. */
  relAttr: string | null
}

export type BacklinkResult = {
  live: boolean
  rel: BacklinkRel | null
  matches: BacklinkMatch[]
  /** True when a page level meta robots directive downgraded every link. */
  pageNofollow: boolean
}

/**
 * Google treats `ugc` and `sponsored` the same way it treats `nofollow`: as a
 * hint not to pass authority. A link carrying one of them is not the backlink
 * this campaign is after, so it is reported as nofollow rather than as a win.
 */
const NOFOLLOW_TOKENS = new Set(['nofollow', 'ugc', 'sponsored'])

function attr(tag: string, name: string): string | null {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag)
  if (quoted) return quoted[2] ?? quoted[3] ?? ''
  const bare = new RegExp(`\\b${name}\\s*=\\s*([^\\s"'>]+)`, 'i').exec(tag)
  return bare ? bare[1] : null
}

function relIsNofollow(relAttr: string | null) {
  if (!relAttr) return false
  return relAttr
    .toLowerCase()
    .split(/[\s,]+/)
    .some((token) => NOFOLLOW_TOKENS.has(token))
}

/** `https://WWW.Northwind.dev/?ref=x` and `northwind.dev` are the same target. */
export function sameTarget(href: string, productUrl: string, base?: string): boolean {
  const target = toUrl(productUrl)
  if (!target) return false

  const candidate = toUrl(href, base)
  if (!candidate) return false

  const strip = (host: string) => host.toLowerCase().replace(/^www\./, '')
  if (strip(candidate.hostname) !== strip(target.hostname)) return false

  // A link to any page of the product counts. Directories link the homepage,
  // a pricing page or a deep link, and all of them pass authority.
  return true
}

function toUrl(value: string, base?: string): URL | null {
  const raw = value.trim()
  if (!raw) return null
  try {
    return new URL(raw, base)
  } catch {
    try {
      return new URL(`https://${raw}`)
    } catch {
      return null
    }
  }
}

/**
 * Does this listing page really carry a link to the product, and does it pass
 * authority? Counting submissions is easy and meaningless; this is the number
 * that says whether the campaign worked.
 */
export function findBacklink(html: string, productUrl: string, pageUrl?: string): BacklinkResult {
  const pageNofollow = hasMetaNofollow(html)
  const base = resolveBase(html, pageUrl)
  const matches: BacklinkMatch[] = []

  for (const [tag] of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(tag, 'href')
    if (!href) continue
    if (!sameTarget(href, productUrl, base)) continue

    const relAttr = attr(tag, 'rel')
    const rel: BacklinkRel = pageNofollow || relIsNofollow(relAttr) ? 'nofollow' : 'dofollow'
    matches.push({ href: href.trim(), rel, relAttr })
  }

  if (matches.length === 0) return { live: false, rel: null, matches, pageNofollow }

  // One dofollow anywhere on the page is the whole point, so the best link
  // wins rather than the first one found.
  const rel: BacklinkRel = matches.some((m) => m.rel === 'dofollow') ? 'dofollow' : 'nofollow'
  return { live: true, rel, matches, pageNofollow }
}

function hasMetaNofollow(html: string): boolean {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const name = attr(tag, 'name')
    if (!name || !/^(robots|googlebot)$/i.test(name.trim())) continue
    const content = attr(tag, 'content') ?? ''
    if (
      content
        .toLowerCase()
        .split(/[\s,]+/)
        .some((token) => token === 'nofollow' || token === 'none')
    ) {
      return true
    }
  }
  return false
}

function resolveBase(html: string, pageUrl?: string): string | undefined {
  const baseTag = /<base\b[^>]*>/i.exec(html)
  const href = baseTag ? attr(baseTag[0], 'href') : null
  if (!href) return pageUrl
  try {
    return new URL(href, pageUrl).toString()
  } catch {
    return pageUrl
  }
}
