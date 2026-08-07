import { describe, test, expect } from 'vitest'
import {
  CONNECTORS, CONN_FAMILIES, CONN_BEHAVIOR_LABEL, CONN_PLACEMENT, CONN_PLACEMENT_EN,
  connectorsForFamilies, isPair
} from '../../src/data/connectors'

// da-compound homographs must stay out: a card can drill a da-compound AND a
// connector at once, and these words would make grading attribution ambiguous.
const DA_HOMOGRAPHS = ['darum', 'dagegen', 'danach', 'dabei', 'davor', 'damit']

describe('connector bank', () => {
  test('ids are unique', () => {
    const ids = CONNECTORS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  test('displays are unique and pairs use the ellipsis form', () => {
    const displays = CONNECTORS.map(c => c.display)
    expect(new Set(displays).size).toBe(displays.length)
    for (const c of CONNECTORS.filter(isPair)) {
      expect(c.display).toContain(' … ')
      expect(c.parts).toHaveLength(2)
    }
  })
  test('every connector has 1 or 2 parts, non-empty text, valid behavior', () => {
    for (const c of CONNECTORS) {
      expect([1, 2]).toContain(c.parts.length)
      for (const p of c.parts) {
        expect(p.text.trim().length).toBeGreaterThan(0)
        expect(['0', 'inv', 'end']).toContain(p.behavior)
      }
    }
  })
  test('single-word display equals its only part text', () => {
    for (const c of CONNECTORS.filter(c => !isPair(c))) {
      expect(c.display).toBe(c.parts[0].text)
    }
  })
  test('all six families exist and none is empty', () => {
    expect(CONN_FAMILIES.map(f => f.id).sort()).toEqual(
      ['additiv', 'adversativ', 'alternativ', 'kausal', 'konzessiv', 'temporal']
    )
    for (const f of CONN_FAMILIES) {
      expect(connectorsForFamilies([f.id]).length).toBeGreaterThan(0)
    }
  })
  test('bank is comprehensive (>= 35 connectors) and excludes da-homographs', () => {
    expect(CONNECTORS.length).toBeGreaterThanOrEqual(35)
    for (const c of CONNECTORS) {
      for (const p of c.parts) expect(DA_HOMOGRAPHS).not.toContain(p.text)
    }
  })
  test('known word-order behaviors are correct', () => {
    const byId = new Map(CONNECTORS.map(c => [c.id, c]))
    expect(byId.get('aber')!.parts[0].behavior).toBe('0')
    expect(byId.get('jedoch')!.parts[0].behavior).toBe('inv')
    expect(byId.get('weil')!.parts[0].behavior).toBe('end')
    expect(byId.get('je-desto')!.parts.map(p => p.behavior)).toEqual(['end', 'inv'])
    expect(byId.get('zwar-aber')!.parts.map(p => p.behavior)).toEqual(['inv', '0'])
  })
  test('behavior labels', () => {
    expect(CONN_BEHAVIOR_LABEL['0']).toBe('Wortstellung bleibt')
    expect(CONN_BEHAVIOR_LABEL.inv).toBe('Inversion')
    expect(CONN_BEHAVIOR_LABEL.end).toBe('Verb ans Ende')
  })
  test('placement: only a subjunctor builds a Nebensatz; adverbs take I or III', () => {
    expect(CONN_PLACEMENT['0']).toMatchObject({ clause: 'HZ', position: '0' })
    expect(CONN_PLACEMENT.inv).toMatchObject({ clause: 'HZ', position: 'I / III' })
    expect(CONN_PLACEMENT.end).toMatchObject({ clause: 'NZ', position: '0' })
  })
  test('placement of the connectors the learner is most likely to confuse', () => {
    const byId = new Map(CONNECTORS.map(c => [c.id, c]))
    const place = (id: string, part = 0) => CONN_PLACEMENT[byId.get(id)!.parts[part].behavior]
    expect(place('aber')).toMatchObject({ clause: 'HZ', position: '0' })
    expect(place('zwar-aber', 0)).toMatchObject({ clause: 'HZ', position: 'I / III' }) // zwar
    expect(place('zwar-aber', 1)).toMatchObject({ clause: 'HZ', position: '0' })       // aber
    expect(place('obwohl')).toMatchObject({ clause: 'NZ', position: '0' })
    expect(place('trotzdem')).toMatchObject({ clause: 'HZ', position: 'I / III' })
  })
  test('the English gloss the AI grades against admits the Mittelfeld for adverbs', () => {
    expect(CONN_PLACEMENT_EN.inv).toContain('position I or III')
    expect(CONN_PLACEMENT_EN.end).toContain('Nebensatz')
    expect(CONN_PLACEMENT_EN['0']).toContain('position 0')
  })
})
