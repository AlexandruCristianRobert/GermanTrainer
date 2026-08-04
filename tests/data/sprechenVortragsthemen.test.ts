import { describe, it, expect } from 'vitest'
import { SPRECHEN_VORTRAGSTHEMEN, VORTRAGSTHEMA_GENERATOR_SCHEMA } from '../../src/data/sprechenVortragsthemen'
import { TOPIC_TAGS } from '../../src/data/sprechenTopics'

describe('SPRECHEN_VORTRAGSTHEMEN', () => {
  it('ships 60 themes with unique ids and unique titles', () => {
    expect(SPRECHEN_VORTRAGSTHEMEN).toHaveLength(60)
    expect(new Set(SPRECHEN_VORTRAGSTHEMEN.map(t => t.id)).size).toBe(60)
    expect(new Set(SPRECHEN_VORTRAGSTHEMEN.map(t => t.titleDe)).size).toBe(60)
  })

  it('ids are all vt- prefixed and slug-shaped', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) expect(t.id).toMatch(/^vt-[a-z0-9-]+$/)
  })

  it('every theme is a task-sheet instruction, not a thesis', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      expect(t.taskDe.startsWith('Halten Sie einen kurzen Vortrag darüber')).toBe(true)
      expect(t.taskDe.endsWith('.')).toBe(true)
      expect(t.taskDe.length).toBeGreaterThan(60)
      expect(t.taskDe.length).toBeLessThan(220)
      // A Vortragsthema takes no sides — it must not be phrased as a question.
      expect(t.taskDe).not.toContain('?')
    }
  })

  it('titles are short labels', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      expect(t.titleDe.length).toBeGreaterThanOrEqual(3)
      expect(t.titleDe.length).toBeLessThanOrEqual(45)
    }
  })

  it('tags every theme with 1-2 known TopicTags', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      expect(t.tags.length).toBeGreaterThanOrEqual(1)
      expect(t.tags.length).toBeLessThanOrEqual(2)
      for (const tag of t.tags) expect(TOPIC_TAGS).toContain(tag)
    }
  })

  it('uses every one of the ten tag fields at least three times', () => {
    for (const tag of TOPIC_TAGS) {
      const n = SPRECHEN_VORTRAGSTHEMEN.filter(t => t.tags.includes(tag)).length
      expect(n, `tag ${tag}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('marks every seeded theme level B2 and source seed', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      expect(t.level).toBe('B2')
      expect(t.source).toBe('seed')
    }
  })
})

describe('VORTRAGSTHEMA_GENERATOR_SCHEMA', () => {
  it('requires titleDe, taskDe and tags per item', () => {
    const item = (VORTRAGSTHEMA_GENERATOR_SCHEMA as any).properties.themen.items
    expect(item.required).toEqual(['titleDe', 'taskDe', 'tags'])
  })
})
