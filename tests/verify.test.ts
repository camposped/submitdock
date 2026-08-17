import { describe, expect, it } from 'vitest'

import { findBacklink, sameTarget } from '@/lib/verify'

const PRODUCT = 'https://northwind.dev'

const page = (body: string, head = '') =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`

describe('findBacklink', () => {
  it('finds a plain dofollow link', () => {
    const result = findBacklink(page('<a href="https://northwind.dev">Northwind</a>'), PRODUCT)
    expect(result.live).toBe(true)
    expect(result.rel).toBe('dofollow')
  })

  it('reports a rel=nofollow link as nofollow, not as a win', () => {
    const result = findBacklink(
      page('<a rel="nofollow" href="https://northwind.dev/">Northwind</a>'),
      PRODUCT,
    )
    expect(result.live).toBe(true)
    expect(result.rel).toBe('nofollow')
  })

  it('treats ugc and sponsored as nofollow', () => {
    for (const rel of ['ugc', 'sponsored', 'noopener ugc']) {
      const result = findBacklink(page(`<a rel="${rel}" href="https://northwind.dev">k</a>`), PRODUCT)
      expect(result.rel, rel).toBe('nofollow')
    }
  })

  it('does not count rel values that merely contain the word', () => {
    const result = findBacklink(
      page('<a rel="noopener noreferrer" href="https://northwind.dev">k</a>'),
      PRODUCT,
    )
    expect(result.rel).toBe('dofollow')
  })

  it('says missing when the page links to somebody else', () => {
    const result = findBacklink(
      page('<a href="https://chartmogul.com">ChartMogul</a><a href="/pricing">Pricing</a>'),
      PRODUCT,
    )
    expect(result.live).toBe(false)
    expect(result.rel).toBeNull()
  })

  it('ignores a domain that merely contains the product name', () => {
    const result = findBacklink(page('<a href="https://notnorthwind.dev">x</a>'), PRODUCT)
    expect(result.live).toBe(false)
  })

  it('matches through www, trailing slash, query strings and deep links', () => {
    for (const href of [
      'https://www.northwind.dev',
      'https://northwind.dev/',
      'https://northwind.dev/?ref=saashub&utm_source=x',
      'http://northwind.dev/features/mcp',
      '//northwind.dev/pricing',
    ]) {
      expect(findBacklink(page(`<a href="${href}">k</a>`), PRODUCT).live, href).toBe(true)
    }
  })

  it('handles single quoted and unquoted attributes', () => {
    expect(findBacklink(page("<a href='https://northwind.dev'>k</a>"), PRODUCT).live).toBe(true)
    expect(findBacklink(page('<a href=https://northwind.dev>k</a>'), PRODUCT).live).toBe(true)
  })

  it('downgrades every link when meta robots says nofollow', () => {
    const result = findBacklink(
      page('<a href="https://northwind.dev">k</a>', '<meta name="robots" content="index, nofollow">'),
      PRODUCT,
    )
    expect(result.live).toBe(true)
    expect(result.rel).toBe('nofollow')
    expect(result.pageNofollow).toBe(true)
  })

  it('prefers the dofollow link when the page has both', () => {
    const result = findBacklink(
      page(
        '<a rel="nofollow" href="https://northwind.dev">logo</a>' +
          '<a href="https://northwind.dev/pricing">visit</a>',
      ),
      PRODUCT,
    )
    expect(result.rel).toBe('dofollow')
    expect(result.matches).toHaveLength(2)
  })

  it('resolves relative hrefs against the page it was fetched from', () => {
    const html = page('<a href="/go/northwind">visit</a>')
    expect(findBacklink(html, PRODUCT, 'https://saashub.com/northwind').live).toBe(false)
  })

  it('honours a base tag', () => {
    const result = findBacklink(
      page('<a href="/">home</a>', '<base href="https://northwind.dev/">'),
      PRODUCT,
      'https://saashub.com/northwind',
    )
    expect(result.live).toBe(true)
  })
})

describe('sameTarget', () => {
  it('compares hostnames, not strings', () => {
    expect(sameTarget('https://www.northwind.dev/x', 'https://northwind.dev')).toBe(true)
    expect(sameTarget('https://northwind.dev.br', 'https://northwind.dev')).toBe(false)
    expect(sameTarget('mailto:hi@northwind.dev', 'https://northwind.dev')).toBe(false)
    expect(sameTarget('', 'https://northwind.dev')).toBe(false)
  })
})
