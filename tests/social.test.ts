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
    expect(toHandle('acmeapp')).toBe('acmeapp')
  })

  it('strips a leading @', () => {
    expect(toHandle('@acmeapp')).toBe('acmeapp')
  })

  it('strips a full URL down to the handle', () => {
    expect(toHandle('https://x.com/acmeapp')).toBe('acmeapp')
    expect(toHandle('https://www.instagram.com/acmeapp/')).toBe('acmeapp')
  })

  it('drops the path segment a network puts before the handle', () => {
    expect(toHandle('https://linkedin.com/company/acmeapp')).toBe('acmeapp')
    expect(toHandle('https://youtube.com/@acmeapp')).toBe('acmeapp')
    expect(toHandle('https://youtube.com/c/acmeapp')).toBe('acmeapp')
  })

  it('drops query strings, which is how share links arrive', () => {
    expect(toHandle('https://x.com/acmeapp?ref=share')).toBe('acmeapp')
  })

  it('is empty for empty input rather than inventing a handle', () => {
    expect(toHandle('')).toBe('')
    expect(toHandle('   ')).toBe('')
  })
})

describe('socialUrl', () => {
  it('builds each network its own shape', () => {
    expect(socialUrl(net('x'), 'acmeapp')).toBe('https://x.com/acmeapp')
    expect(socialUrl(net('youtube'), 'acmeapp')).toBe('https://youtube.com/@acmeapp')
    expect(socialUrl(net('linkedin'), 'acmeapp')).toBe('https://linkedin.com/company/acmeapp')
  })

  it('round trips a pasted URL back to itself', () => {
    const url = 'https://linkedin.com/company/acmeapp'
    expect(socialUrl(net('linkedin'), url)).toBe(url)
  })

  it('returns empty rather than a bare base URL when there is no handle', () => {
    expect(socialUrl(net('x'), '')).toBe('')
  })
})
