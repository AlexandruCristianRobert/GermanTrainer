import { describe, expect, it } from 'vitest'
import { SPRECHEN_TOPICS, TOPIC_TAGS } from '../../src/data/sprechenTopics'

describe('sprechenTopics seed', () => {
  it('contains exactly 100 topics', () => {
    expect(SPRECHEN_TOPICS.length).toBe(100)
  })

  it('has unique ids', () => {
    const ids = new Set(SPRECHEN_TOPICS.map(t => t.id))
    expect(ids.size).toBe(SPRECHEN_TOPICS.length)
  })

  it('has unique titles (done-topic memory keys on titleDe)', () => {
    const titles = new Set(SPRECHEN_TOPICS.map(t => t.titleDe))
    expect(titles.size).toBe(SPRECHEN_TOPICS.length)
  })

  it('every topic is a well-formed seed entry', () => {
    for (const t of SPRECHEN_TOPICS) {
      expect(t.id).toMatch(/^st-[a-z0-9-]+$/)
      expect(t.titleDe.length).toBeGreaterThan(2)
      expect(t.statementDe.length).toBeGreaterThan(10)
      expect(t.level).toBe('B2')
      expect(t.source).toBe('seed')
      expect(t.tags.length).toBeGreaterThan(0)
      for (const tag of t.tags) expect(TOPIC_TAGS).toContain(tag)
    }
  })

  it('spreads across all ten tags (at least 8 topics each)', () => {
    for (const tag of TOPIC_TAGS) {
      const n = SPRECHEN_TOPICS.filter(t => t.tags.includes(tag)).length
      expect(n).toBeGreaterThanOrEqual(8)
    }
  })
})
