import { describe, expect, it } from 'vitest'

import { SOCIAL_NETWORKS, socialUrl, toHandle } from '../lib/social'

const net = (field: string) => SOCIAL_NETWORKS.find((n) => n.field === field)!

/**
 * People paste whatever the network showed them. Every one of these is a real
 * shape a profile gets copied in, and getting it wrong means a directory form
 * receives a handle that points at nothing.
 */
describe('toHandle', () => {
  it('takes a bare handle unchanged', () => {
    expect(toHandle('kometrics')).toBe('kometrics')
  })

  it('strips a leading @', () => {
    expect(toHandle('@kometrics')).toBe('kometrics')
  })

  it('strips a full URL down to the handle', () => {
    expect(toHandle('https://x.com/kometrics')).toBe('kometrics')
    expect(toHandle('https://www.instagram.com/kometrics/')).toBe('kometrics')
  })

  it('drops the path segment a network puts before the handle', () => {
    expect(toHandle('https://linkedin.com/company/kometrics')).toBe('kometrics')
    expect(toHandle('https://youtube.com/@kometrics')).toBe('kometrics')
    expect(toHandle('https://youtube.com/c/kometrics')).toBe('kometrics')
  })

  it('drops query strings, which is how share links arrive', () => {
    expect(toHandle('https://x.com/kometrics?ref=share')).toBe('kometrics')
  })

  it('is empty for empty input rather than inventing a handle', () => {
    expect(toHandle('')).toBe('')
    expect(toHandle('   ')).toBe('')
  })
})

describe('socialUrl', () => {
  it('builds each network its own shape', () => {
    expect(socialUrl(net('x'), 'kometrics')).toBe('https://x.com/kometrics')
    expect(socialUrl(net('youtube'), 'kometrics')).toBe('https://youtube.com/@kometrics')
    expect(socialUrl(net('linkedin'), 'kometrics')).toBe('https://linkedin.com/company/kometrics')
  })

  it('round trips a pasted URL back to itself', () => {
    const url = 'https://linkedin.com/company/kometrics'
    expect(socialUrl(net('linkedin'), url)).toBe(url)
  })

  it('returns empty rather than a bare base URL when there is no handle', () => {
    expect(socialUrl(net('x'), '')).toBe('')
  })
})
