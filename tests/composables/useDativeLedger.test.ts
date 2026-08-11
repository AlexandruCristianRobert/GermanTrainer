import { describe, test, expect, beforeEach } from 'vitest'
import {
  LEDGER_KEY, ledgerState, bumpDativeLedger, readDativeLedger, ledgerSummary,
} from '../../src/composables/useDativeLedger'
import { DATIVE_VERB_KEYS } from '../../src/data/dativeVerbs'
import { DATIVE_ADJECTIVE_KEYS } from '../../src/data/dativeAdjectives'

const ITEM = 'helfen'          // a real verb item
const ADJ = 'wichtig'          // a real adjective item

beforeEach(() => localStorage.clear())

describe('ledgerState rule', () => {
  test('an unknown key reads new', () => {
    expect(ledgerState(undefined)).toBe('new')
    expect(readDativeLedger()[ITEM]).toBeUndefined()
  })

  test('three correct encounters make an item gesichert', () => {
    bumpDativeLedger(ITEM, true, 1)
    bumpDativeLedger(ITEM, true, 2)
    expect(ledgerState(readDativeLedger()[ITEM])).toBe('wackelig')
    bumpDativeLedger(ITEM, true, 3)
    expect(ledgerState(readDativeLedger()[ITEM])).toBe('gesichert')
  })

  test('a single miss demotes a secured item', () => {
    for (const at of [1, 2, 3]) bumpDativeLedger(ITEM, true, at)
    bumpDativeLedger(ITEM, false, 4)
    expect(ledgerState(readDativeLedger()[ITEM])).toBe('wackelig')
  })

  test('a fourth encounter evicts the oldest: miss then three corrects re-secures', () => {
    bumpDativeLedger(ITEM, false, 1)
    bumpDativeLedger(ITEM, true, 2)
    bumpDativeLedger(ITEM, true, 3)
    bumpDativeLedger(ITEM, true, 4)
    const entry = readDativeLedger()[ITEM]
    expect(entry.recent).toEqual([true, true, true])
    expect(entry.encounters).toBe(4)
    expect(entry.lastAt).toBe(4)
    expect(ledgerState(entry)).toBe('gesichert')
  })

  test('adjective keys are ledger items too', () => {
    for (const at of [1, 2, 3]) bumpDativeLedger(ADJ, true, at)
    expect(ledgerState(readDativeLedger()[ADJ])).toBe('gesichert')
  })
})

describe('unknown keys and the denominator', () => {
  test('a bump for a key with no matching item writes nothing', () => {
    bumpDativeLedger('kein-item', true, 1)
    expect(localStorage.getItem(LEDGER_KEY)).toBeNull()
  })

  test('a stored key with no matching item is excluded on read and from the summary', () => {
    localStorage.setItem(LEDGER_KEY, JSON.stringify({
      'kein-item': { recent: [true, true, true], encounters: 3, lastAt: 9 },
    }))
    expect(Object.keys(readDativeLedger())).toEqual([])
    const s = ledgerSummary()
    expect(s.secured).toBe(0)
    expect(s.total).toBe(DATIVE_VERB_KEYS.length + DATIVE_ADJECTIVE_KEYS.length)
  })

  test('the denominator is derived from the two side-tables, never hard-coded', () => {
    const s = ledgerSummary()
    expect(s.total).toBe(DATIVE_VERB_KEYS.length + DATIVE_ADJECTIVE_KEYS.length)
    expect(s.fresh).toBe(s.total)
    bumpDativeLedger(ITEM, true, 1)
    const s2 = ledgerSummary()
    expect(s2.shaky).toBe(1)
    expect(s2.fresh).toBe(s2.total - 1)
  })

  test('a corrupt store reads as empty (absent-store = valid empty state)', () => {
    localStorage.setItem(LEDGER_KEY, '{not json')
    expect(readDativeLedger()).toEqual({})
    expect(ledgerSummary().secured).toBe(0)
  })
})
