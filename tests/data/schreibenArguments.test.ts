import { describe, expect, it, test } from 'vitest'
import { SCHREIBEN_THEMEN, type Schreibthema } from '../../src/data/schreibenThemen'
import { TOPIC_TAGS, type TopicTag } from '../../src/data/sprechenTopics'
import type { ArgumentBank } from '../../src/data/sprechenArguments'
import {
  SCHREIB_TAG_ARGUMENT_BANKS, SCHREIB_THEMA_ARGUMENT_BANKS, resolveSchreibArgumentBank
} from '../../src/data/schreibenArguments'

function allBanks(): ArgumentBank[] {
  return [...Object.values(SCHREIB_TAG_ARGUMENT_BANKS), ...Object.values(SCHREIB_THEMA_ARGUMENT_BANKS)]
}

describe('SCHREIB_TAG_ARGUMENT_BANKS', () => {
  it('has a bank for every TopicTag and no extra keys', () => {
    for (const tag of TOPIC_TAGS) {
      expect(SCHREIB_TAG_ARGUMENT_BANKS[tag]).toBeDefined()
    }
    expect(Object.keys(SCHREIB_TAG_ARGUMENT_BANKS).length).toBe(TOPIC_TAGS.length)
  })

  it('every tag bank has exactly 3 pro, 3 contra, 6 words', () => {
    for (const tag of TOPIC_TAGS) {
      const bank = SCHREIB_TAG_ARGUMENT_BANKS[tag]
      expect(bank.pro.length).toBe(3)
      expect(bank.contra.length).toBe(3)
      expect(bank.words.length).toBe(6)
    }
  })
})

describe('SCHREIB_THEMA_ARGUMENT_BANKS', () => {
  const expectedIds = ['wt-homeoffice', 'wt-ki-im-alltag', 'wt-fast-fashion']

  it('exists for exactly the three flagship Schreibthema ids', () => {
    expect(Object.keys(SCHREIB_THEMA_ARGUMENT_BANKS).sort()).toEqual([...expectedIds].sort())
  })

  it('each flagship Schreibthema id is a real seeded Schreibthema', () => {
    const seedIds = new Set(SCHREIBEN_THEMEN.map(t => t.id))
    for (const id of expectedIds) {
      expect(seedIds.has(id)).toBe(true)
    }
  })

  it('every flagship bank has exactly 4 pro, 4 contra, 6 words', () => {
    for (const id of expectedIds) {
      const bank = SCHREIB_THEMA_ARGUMENT_BANKS[id]
      expect(bank.pro.length).toBe(4)
      expect(bank.contra.length).toBe(4)
      expect(bank.words.length).toBe(6)
    }
  })
})

describe('content shape invariants', () => {
  it('no claim exceeds 120 characters anywhere', () => {
    for (const bank of allBanks()) {
      for (const angle of [...bank.pro, ...bank.contra]) {
        expect(angle.claim.length).toBeLessThanOrEqual(120)
      }
    }
  })

  it('no field is an empty string', () => {
    for (const bank of allBanks()) {
      for (const angle of [...bank.pro, ...bank.contra]) {
        expect(angle.claim.trim().length).toBeGreaterThan(0)
        expect(angle.why.trim().length).toBeGreaterThan(0)
      }
      for (const word of bank.words) {
        expect(word.de.trim().length).toBeGreaterThan(0)
        expect(word.en.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('words carry an article for nouns (der/die/das)', () => {
    for (const bank of allBanks()) {
      for (const word of bank.words) {
        expect(word.de).toMatch(/^(der|die|das)\s/)
      }
    }
  })

  test('claims read as written argument, not spoken filler', () => {
    for (const bank of Object.values(SCHREIB_TAG_ARGUMENT_BANKS)) {
      for (const a of [...bank.pro, ...bank.contra]) {
        expect(a.claim).not.toMatch(/^(Na ja|Also|Ich finde halt)/)
        expect(a.claim.endsWith('.')).toBe(true)
      }
    }
  })
})

describe('resolveSchreibArgumentBank', () => {
  const thema = (overrides: Partial<Schreibthema> = {}): Pick<Schreibthema, 'id' | 'tags'> => ({
    id: 'wt-does-not-exist',
    tags: ['Umwelt'],
    ...overrides
  })

  it('prefers a cached bank over everything else', () => {
    const cachedBank: ArgumentBank = { pro: [], contra: [], words: [] }
    const t = thema({ id: 'wt-homeoffice', tags: ['Arbeit'] })
    const result = resolveSchreibArgumentBank(t, cachedBank)
    expect(result.scope).toBe('cached')
    expect(result.bank).toBe(cachedBank)
  })

  it('falls back to SCHREIB_THEMA_ARGUMENT_BANKS by id when no cache is given', () => {
    const t = thema({ id: 'wt-homeoffice', tags: ['Arbeit'] })
    const result = resolveSchreibArgumentBank(t)
    expect(result.scope).toBe('thema')
    expect(result.bank).toBe(SCHREIB_THEMA_ARGUMENT_BANKS['wt-homeoffice'])
  })

  it('falls back to the first matching tag bank when the id is unknown', () => {
    const t = thema({ id: 'wt-unknown-id', tags: ['Reisen', 'Umwelt'] })
    const result = resolveSchreibArgumentBank(t)
    expect(result.scope).toBe('Reisen')
    expect(result.bank).toBe(SCHREIB_TAG_ARGUMENT_BANKS.Reisen)
  })

  it('falls back to Gesellschaft when the thema has no recognized tag', () => {
    const t = thema({ id: 'wt-unknown-id', tags: ['Quatsch' as unknown as TopicTag] })
    const result = resolveSchreibArgumentBank(t)
    expect(result.scope).toBe('Gesellschaft')
    expect(result.bank).toBe(SCHREIB_TAG_ARGUMENT_BANKS.Gesellschaft)
  })

  it('falls back to Gesellschaft when the thema has no tags at all', () => {
    const t = thema({ id: 'wt-unknown-id', tags: [] })
    const result = resolveSchreibArgumentBank(t)
    expect(result.scope).toBe('Gesellschaft')
  })
})
