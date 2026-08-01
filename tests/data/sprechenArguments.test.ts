import { describe, expect, it } from 'vitest'
import { SPRECHEN_TOPICS, TOPIC_TAGS, type SprechenTopic, type TopicTag } from '../../src/data/sprechenTopics'
import {
  TAG_ARGUMENT_BANKS, TOPIC_ARGUMENT_BANKS, resolveArgumentBank, type ArgumentBank
} from '../../src/data/sprechenArguments'

function allBanks(): ArgumentBank[] {
  return [...Object.values(TAG_ARGUMENT_BANKS), ...Object.values(TOPIC_ARGUMENT_BANKS)]
}

describe('TAG_ARGUMENT_BANKS', () => {
  it('has a bank for every TopicTag', () => {
    for (const tag of TOPIC_TAGS) {
      expect(TAG_ARGUMENT_BANKS[tag]).toBeDefined()
    }
    expect(Object.keys(TAG_ARGUMENT_BANKS).length).toBe(TOPIC_TAGS.length)
  })

  it('every tag bank has exactly 3 pro, 3 contra, 6 words', () => {
    for (const tag of TOPIC_TAGS) {
      const bank = TAG_ARGUMENT_BANKS[tag]
      expect(bank.pro.length).toBe(3)
      expect(bank.contra.length).toBe(3)
      expect(bank.words.length).toBe(6)
    }
  })
})

describe('TOPIC_ARGUMENT_BANKS', () => {
  const expectedIds = [
    'st-arbeit-vier-tage-woche',
    'st-tech-ki-im-alltag',
    'st-bildung-schulnoten',
    'st-umwelt-autofreie-innenstadt'
  ]

  it('exists for exactly the four flagship Topic ids', () => {
    expect(Object.keys(TOPIC_ARGUMENT_BANKS).sort()).toEqual([...expectedIds].sort())
  })

  it('each flagship Topic id is a real seeded Topic', () => {
    const seedIds = new Set(SPRECHEN_TOPICS.map(t => t.id))
    for (const id of expectedIds) {
      expect(seedIds.has(id)).toBe(true)
    }
  })

  it('every topic bank has exactly 4 pro, 4 contra, 6 words', () => {
    for (const id of expectedIds) {
      const bank = TOPIC_ARGUMENT_BANKS[id]
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
})

describe('resolveArgumentBank', () => {
  const topic = (overrides: Partial<SprechenTopic> = {}): SprechenTopic => ({
    id: 'st-does-not-exist',
    titleDe: 'Testthema',
    statementDe: 'Ist das ein Testthema?',
    tags: ['Umwelt'],
    level: 'B2',
    source: 'seed',
    ...overrides
  })

  it('prefers a cached bank over everything else', () => {
    const cachedBank: ArgumentBank = { pro: [], contra: [], words: [] }
    const t = topic({ id: 'st-arbeit-vier-tage-woche', tags: ['Arbeit'] })
    const result = resolveArgumentBank(t, cachedBank)
    expect(result.scope).toBe('cached')
    expect(result.bank).toBe(cachedBank)
  })

  it('falls back to TOPIC_ARGUMENT_BANKS by id when no cache is given', () => {
    const t = topic({ id: 'st-arbeit-vier-tage-woche', tags: ['Arbeit'] })
    const result = resolveArgumentBank(t)
    expect(result.scope).toBe('topic')
    expect(result.bank).toBe(TOPIC_ARGUMENT_BANKS['st-arbeit-vier-tage-woche'])
  })

  it('falls back to the first matching tag bank when the id is unknown', () => {
    const t = topic({ id: 'st-unknown-id', tags: ['Reisen', 'Umwelt'] })
    const result = resolveArgumentBank(t)
    expect(result.scope).toBe('Reisen')
    expect(result.bank).toBe(TAG_ARGUMENT_BANKS.Reisen)
  })

  it('falls back to Gesellschaft when the topic has no recognized tag', () => {
    const t = topic({ id: 'st-unknown-id', tags: ['Quatsch' as unknown as TopicTag] })
    const result = resolveArgumentBank(t)
    expect(result.scope).toBe('Gesellschaft')
    expect(result.bank).toBe(TAG_ARGUMENT_BANKS.Gesellschaft)
  })

  it('falls back to Gesellschaft when the topic has no tags at all', () => {
    const t = topic({ id: 'st-unknown-id', tags: [] })
    const result = resolveArgumentBank(t)
    expect(result.scope).toBe('Gesellschaft')
  })
})
