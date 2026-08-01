import { describe, it, expect, beforeEach } from 'vitest'
import {
  REDEMITTEL_YIELD_KEY, loadRedemittelYield, bumpRedemittelYield, lifetimeCounts
} from '../../src/composables/useRedemittelYield'

beforeEach(() => localStorage.clear())

describe('loadRedemittelYield', () => {
  it('reads an absent key as an empty record', () => {
    expect(loadRedemittelYield()).toEqual({})
  })

  it('survives corrupt JSON without throwing', () => {
    localStorage.setItem(REDEMITTEL_YIELD_KEY, '{not json')
    expect(loadRedemittelYield()).toEqual({})
  })

  it('discards entries that are not shaped like a RedemittelUse', () => {
    localStorage.setItem(REDEMITTEL_YIELD_KEY, JSON.stringify({
      'rm-agree-1': { count: 3, lastAt: 1000 },
      'rm-agree-2': 'nope',
      'rm-agree-3': { count: 'x', lastAt: 1 }
    }))
    expect(loadRedemittelYield()).toEqual({ 'rm-agree-1': { count: 3, lastAt: 1000 } })
  })
})

describe('bumpRedemittelYield', () => {
  it('creates an entry on first use', () => {
    bumpRedemittelYield(['rm-agree-1'], 5000)
    expect(loadRedemittelYield()).toEqual({ 'rm-agree-1': { count: 1, lastAt: 5000 } })
  })

  it('increments an existing entry and moves lastAt forward', () => {
    bumpRedemittelYield(['rm-agree-1'], 5000)
    bumpRedemittelYield(['rm-agree-1'], 9000)
    expect(loadRedemittelYield()['rm-agree-1']).toEqual({ count: 2, lastAt: 9000 })
  })

  it('counts a phrase once per call even if passed twice', () => {
    bumpRedemittelYield(['rm-agree-1', 'rm-agree-1'], 5000)
    expect(loadRedemittelYield()['rm-agree-1'].count).toBe(1)
  })

  it('does not move lastAt backwards', () => {
    bumpRedemittelYield(['rm-agree-1'], 9000)
    bumpRedemittelYield(['rm-agree-1'], 5000)
    expect(loadRedemittelYield()['rm-agree-1']).toEqual({ count: 2, lastAt: 9000 })
  })

  it('is a no-op for an empty id list', () => {
    bumpRedemittelYield([], 5000)
    expect(localStorage.getItem(REDEMITTEL_YIELD_KEY)).toBeNull()
  })
})

describe('lifetimeCounts', () => {
  it('flattens the rollup to id → count', () => {
    bumpRedemittelYield(['rm-agree-1', 'rm-ask-1'], 5000)
    bumpRedemittelYield(['rm-agree-1'], 6000)
    expect(lifetimeCounts()).toEqual({ 'rm-agree-1': 2, 'rm-ask-1': 1 })
  })
})
