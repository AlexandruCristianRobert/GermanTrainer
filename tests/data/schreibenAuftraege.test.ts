import { describe, test, expect } from 'vitest'
import {
  SCHREIBEN_AUFTRAEGE, SCHREIB_ANLAESSE, ANLASS_LABEL,
  NACHRICHT_TASK_PREFIX, SCHREIBAUFTRAG_GENERATOR_SCHEMA
} from '../../src/data/schreibenAuftraege'

describe('schreibenAuftraege seed pool', () => {
  test('exactly 40 Aufträge, unique ids and titles, 8 per Anlass', () => {
    expect(SCHREIBEN_AUFTRAEGE.length).toBe(40)
    expect(new Set(SCHREIBEN_AUFTRAEGE.map(a => a.id)).size).toBe(40)
    expect(new Set(SCHREIBEN_AUFTRAEGE.map(a => a.titleDe)).size).toBe(40)
    for (const anlass of SCHREIB_ANLAESSE) {
      expect(SCHREIBEN_AUFTRAEGE.filter(a => a.anlass === anlass).length, anlass).toBe(8)
    }
  })
  test('ids match wa- slug pattern', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) expect(a.id).toMatch(/^wa-[a-z0-9-]+$/)
  })
  test('taskDe: exam wording with the 100-word floor, names the Empfänger, no question mark', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      expect(a.taskDe.startsWith(NACHRICHT_TASK_PREFIX), a.id).toBe(true)
      expect(a.taskDe, a.id).toMatch(/mindestens 100 Wörter/)
      expect(a.taskDe, a.id).toContain(a.empfaengerName.split(' ').pop()!)
      expect(a.taskDe, a.id).not.toContain('?')
      expect(a.taskDe.length, a.id).toBeGreaterThan(60)
      expect(a.taskDe.length, a.id).toBeLessThan(280)
    }
  })
  test('situationDe situates; Empfänger has name and role', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      expect(a.situationDe.trim().length, a.id).toBeGreaterThan(40)
      expect(a.situationDe.length, a.id).toBeLessThan(300)
      expect(a.empfaengerName, a.id).toMatch(/^(Frau|Herr) [A-ZÄÖÜ]/)
      expect(a.empfaengerRolleDe.trim().length, a.id).toBeGreaterThan(3)
    }
  })
  test('exactly four situation-flavored Inhaltspunkte each, distinct, no question marks', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      expect(a.inhaltspunkte.length, a.id).toBe(4)
      for (const p of a.inhaltspunkte) {
        expect(p.trim().length, a.id).toBeGreaterThan(15)
        expect(p.length, a.id).toBeLessThan(140)
        expect(p, a.id).not.toContain('?')
      }
      expect(new Set(a.inhaltspunkte).size, a.id).toBe(4)
    }
  })
  test('titles 3-45 chars; every seed entry B2/seed; labels for all five Anlässe', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      expect(a.titleDe.length).toBeGreaterThanOrEqual(3)
      expect(a.titleDe.length).toBeLessThanOrEqual(45)
      expect(a.level).toBe('B2')
      expect(a.source).toBe('seed')
    }
    for (const anlass of SCHREIB_ANLAESSE) {
      expect(ANLASS_LABEL[anlass].de.length).toBeGreaterThan(3)
      expect(ANLASS_LABEL[anlass].en.length).toBeGreaterThan(3)
    }
  })
  test('generator schema requires the seven content fields incl. anlass', () => {
    const req = (SCHREIBAUFTRAG_GENERATOR_SCHEMA as any).properties.auftraege.items.required
    expect(req).toEqual(['titleDe', 'situationDe', 'empfaengerName', 'empfaengerRolleDe', 'taskDe', 'inhaltspunkte', 'anlass'])
  })
  test('every seeded Inhaltspunkt is a full sentence ending with a period', () => {
    for (const a of SCHREIBEN_AUFTRAEGE) {
      for (const p of a.inhaltspunkte) expect(p.endsWith('.'), `${a.id}: "${p}"`).toBe(true)
    }
  })
})
