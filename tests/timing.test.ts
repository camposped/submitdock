import { describe, expect, it } from 'vitest'

import { MANUAL_MS, formatDuration, timeSaved } from '../lib/timing'

/**
 * The saving is the one number on the dashboard that is an argument rather
 * than a count, so it gets the tests. Being wrong here is expensive in the
 * same way a wrong backlink verdict is: it flatters.
 */
describe('timeSaved', () => {
  it('counts only attempts that were actually measured', () => {
    const result = timeSaved([60_000, null, 30_000, null])
    expect(result.timed).toBe(2)
    expect(result.agentMs).toBe(90_000)
    expect(result.manualMs).toBe(2 * MANUAL_MS)
  })

  it('ignores zero and negative durations rather than counting them as free work', () => {
    expect(timeSaved([0, -5, 1000]).timed).toBe(1)
  })

  it('is zero when nothing has been timed', () => {
    expect(timeSaved([]).savedMs).toBe(0)
    expect(timeSaved([null, null]).timed).toBe(0)
  })

  it('never reports a negative saving when the agent was slower than a person', () => {
    const slower = MANUAL_MS * 3
    expect(timeSaved([slower]).savedMs).toBe(0)
  })

  it('subtracts the agent time rather than claiming the whole manual cost', () => {
    const result = timeSaved([MANUAL_MS / 4])
    expect(result.savedMs).toBe(MANUAL_MS - MANUAL_MS / 4)
  })
})

describe('formatDuration', () => {
  it('drops the seconds once there are hours', () => {
    expect(formatDuration(3_600_000 + 720_000 + 41_000)).toBe('1h 12m')
  })

  it('drops the minutes when they are zero', () => {
    expect(formatDuration(7_200_000)).toBe('2h')
  })

  it('keeps seconds under an hour', () => {
    expect(formatDuration(161_000)).toBe('2m 41s')
    expect(formatDuration(18_000)).toBe('18s')
  })

  it('says 0s rather than nothing for absent or broken input', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(-1)).toBe('0s')
    expect(formatDuration(NaN)).toBe('0s')
  })
})
