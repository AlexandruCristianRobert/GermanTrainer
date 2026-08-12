import { describe, test, expect } from 'vitest'
import {
  SCHREIBEN_THEMEN, SCHREIBEN_TASK_PREFIX, SCHREIBTHEMA_GENERATOR_SCHEMA
} from '../../src/data/schreibenThemen'
import { TOPIC_TAGS } from '../../src/data/sprechenTopics'

describe('schreibenThemen seed pool', () => {
  test('exactly 24 themes, unique ids and titles', () => {
    expect(SCHREIBEN_THEMEN.length).toBe(24)
    expect(new Set(SCHREIBEN_THEMEN.map(t => t.id)).size).toBe(24)
    expect(new Set(SCHREIBEN_THEMEN.map(t => t.titleDe)).size).toBe(24)
  })
  test('ids match wt- slug pattern', () => {
    for (const t of SCHREIBEN_THEMEN) expect(t.id).toMatch(/^wt-[a-z0-9-]+$/)
  })
  test('taskDe: exam wording with the 150-word floor, no question mark', () => {
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.taskDe.startsWith(SCHREIBEN_TASK_PREFIX), t.id).toBe(true)
      expect(t.taskDe, t.id).toMatch(/mindestens 150 Wörter/)
      expect(t.taskDe, t.id).not.toContain('?')
      expect(t.taskDe.length, t.id).toBeGreaterThan(60)
      expect(t.taskDe.length, t.id).toBeLessThan(260)
    }
  })
  test('forumContextDe is one situating sentence', () => {
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.forumContextDe.trim().length, t.id).toBeGreaterThan(30)
      expect(t.forumContextDe.length, t.id).toBeLessThan(220)
    }
  })
  test('exactly four topic-flavored Inhaltspunkte each', () => {
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.inhaltspunkte.length, t.id).toBe(4)
      for (const p of t.inhaltspunkte) {
        expect(p.trim().length, t.id).toBeGreaterThan(15)
        expect(p.length, t.id).toBeLessThan(140)
        expect(p, t.id).not.toContain('?')
      }
      expect(new Set(t.inhaltspunkte).size, t.id).toBe(4)
    }
  })
  test('titles 3-45 chars; 1-2 valid tags; every tag used at least twice', () => {
    const tagUse = new Map<string, number>()
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.titleDe.length).toBeGreaterThanOrEqual(3)
      expect(t.titleDe.length).toBeLessThanOrEqual(45)
      expect(t.tags.length).toBeGreaterThanOrEqual(1)
      expect(t.tags.length).toBeLessThanOrEqual(2)
      for (const tag of t.tags) {
        expect(TOPIC_TAGS).toContain(tag)
        tagUse.set(tag, (tagUse.get(tag) ?? 0) + 1)
      }
    }
    for (const tag of TOPIC_TAGS) {
      expect(tagUse.get(tag) ?? 0, `tag ${tag} under-covered`).toBeGreaterThanOrEqual(2)
    }
  })
  test('every seed entry is B2/seed', () => {
    for (const t of SCHREIBEN_THEMEN) {
      expect(t.level).toBe('B2')
      expect(t.source).toBe('seed')
    }
  })
  test('generator schema requires the five content fields', () => {
    const req = (SCHREIBTHEMA_GENERATOR_SCHEMA as any).properties.themen.items.required
    expect(req).toEqual(['titleDe', 'forumContextDe', 'taskDe', 'inhaltspunkte', 'tags'])
  })
})
