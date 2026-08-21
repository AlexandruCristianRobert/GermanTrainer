import { describe, it, expect } from 'vitest'
import {
  WORTSCHATZ_VOKABELN, THEMENFELDER, clozeParts, STUFEN
} from '../../src/data/wortschatz'

describe('wortschatz seed invariants', () => {
  it('has the ten Themenfelder', () => {
    expect(THEMENFELDER).toHaveLength(10)
    expect(THEMENFELDER).toContain('Umwelt')
  })

  it('every seed item is mechanically valid', () => {
    const ids = new Set<string>()
    const des = new Set<string>()
    for (const v of WORTSCHATZ_VOKABELN) {
      expect(v.id, v.id).toMatch(/^vk-[a-z]+-[a-z0-9-]+$/)
      expect(ids.has(v.id), `duplicate id ${v.id}`).toBe(false)
      ids.add(v.id)
      const deKey = v.de.toLowerCase()
      expect(des.has(deKey), `duplicate de ${v.de}`).toBe(false)
      des.add(deKey)
      expect(THEMENFELDER).toContain(v.feld)
      expect(v.de.length).toBeGreaterThan(2)
      expect(v.en.length).toBeGreaterThan(1)
      expect(v.source).toBe('seed')
      expect(v.saetze).toHaveLength(2)
      for (const s of v.saetze) {
        const parts = clozeParts(s.de)
        expect(parts, `${v.id}: satz needs exactly one {{…}}: ${s.de}`).not.toBeNull()
        expect(parts!.blank.length).toBeGreaterThan(1)
        expect(s.en.length).toBeGreaterThan(3)
        // the satz must not contain a second blank
        expect(s.de.indexOf('{{')).toBe(s.de.lastIndexOf('{{'))
      }
      if (v.kind === 'einzelwort' && /^(der|die|das) /.test(v.de)) {
        expect(v.plural, `${v.id}: noun needs plural ('' if none)`).toBeDefined()
      }
      if (v.kind === 'wortverbindung') {
        expect(v.de.split(' ').length, `${v.id}: a Wortverbindung is multi-word`).toBeGreaterThan(1)
      }
    }
  })

  it('clozeParts splits a marked sentence', () => {
    expect(clozeParts('Wir müssen {{eine Maßnahme ergreifen}}.')).toEqual({
      before: 'Wir müssen ', blank: 'eine Maßnahme ergreifen', after: '.'
    })
    expect(clozeParts('kein Blank hier.')).toBeNull()
  })

  it('stage ladder is the glossary ladder', () => {
    expect(STUFEN).toEqual(['erkennen', 'luecke', 'abruf', 'anwendung'])
  })
})
