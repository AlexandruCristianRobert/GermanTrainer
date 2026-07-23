import { describe, test, expect } from 'vitest'
import {
  DA_TRANSFORM,
  transformAnswer,
  type TransformItem,
} from '../../src/data/daTransform'
import { PRONOUN_FORMS, type PronounCue } from '../../src/data/daPersonCase'
import { COLLOCATIONS } from '../../src/data/collocations'
import { daCompound } from '../../src/data/daCompounds'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

const CUES: PronounCue[] = [
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie (Plural)', 'Sie',
]

// Contractions that legitimately hide the bare preposition in a thing object.
const CONTRACTIONS: Record<string, string[]> = {
  an: ['am', 'ans'], auf: ['aufs'], in: ['im', 'ins'], von: ['vom'],
  zu: ['zum', 'zur'], für: ['fürs'], um: ['ums'], über: ['übers'], vor: ['vorm'],
}

describe('DA_TRANSFORM invariants', () => {
  // SHIPPING-GATE INVARIANT: the cue 'es' NEVER pairs with an accusative
  // collocation — *auf es is not German. Neuter person objects (das Kind/das
  // Baby → es) may only sit on dative collocations; on accusative ones use a
  // natural-gender cue (er/sie).
  test("cue 'es' never pairs with an accusative collocation (*auf es is ungrammatical)", () => {
    const bad = DA_TRANSFORM.filter(
      i => i.personCue === 'es' && byId.get(i.collocationId)!.case === 'accusative',
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('at least 60 items with unique ids and one item per collocation', () => {
    expect(DA_TRANSFORM.length).toBeGreaterThanOrEqual(60)
    expect(new Set(DA_TRANSFORM.map(i => i.id)).size).toBe(DA_TRANSFORM.length)
    expect(new Set(DA_TRANSFORM.map(i => i.collocationId)).size).toBe(DA_TRANSFORM.length)
  })

  test('kind floors: at least 25 thing and 25 person items', () => {
    expect(DA_TRANSFORM.filter(i => i.objectKind === 'thing').length).toBeGreaterThanOrEqual(25)
    expect(DA_TRANSFORM.filter(i => i.objectKind === 'person').length).toBeGreaterThanOrEqual(25)
  })

  test('ids follow the tr-<collocationId> convention', () => {
    const bad = DA_TRANSFORM.filter(i => i.id !== `tr-${i.collocationId}`)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item joins a real collocation and matches its level', () => {
    const bad = DA_TRANSFORM.filter(
      i => !byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level,
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('objectKind is always thing or person', () => {
    const bad = DA_TRANSFORM.filter(i => i.objectKind !== 'thing' && i.objectKind !== 'person')
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('person items carry a valid cue; thing items carry none', () => {
    const bad = DA_TRANSFORM.filter(i =>
      i.objectKind === 'person'
        ? !(i.personCue && CUES.includes(i.personCue))
        : i.personCue !== undefined,
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('object appears verbatim exactly once in the sentence', () => {
    const bad = DA_TRANSFORM.filter(i => i.sentence.split(i.object).length - 1 !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('object includes the collocation preposition (bare or contracted)', () => {
    const bad = DA_TRANSFORM.filter(i => {
      const prep = byId.get(i.collocationId)!.preposition
      const words = i.object.toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean)
      return !(words.includes(prep) || (CONTRACTIONS[prep] ?? []).some(c => words.includes(c)))
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('person objects lead with the bare preposition so prep+pronoun substitutes cleanly', () => {
    const bad = DA_TRANSFORM.filter(i => {
      if (i.objectKind !== 'person') return false
      const prep = byId.get(i.collocationId)!.preposition
      return !i.object.toLowerCase().startsWith(`${prep} `)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })
})

describe('transformAnswer', () => {
  test('thing -> daCompound(prep); person -> prep + declined cue pronoun', () => {
    for (const item of DA_TRANSFORM) {
      const c = byId.get(item.collocationId)!
      const expected =
        item.objectKind === 'thing'
          ? daCompound(c.preposition)
          : `${c.preposition} ${PRONOUN_FORMS[item.personCue!][c.case]}`
      expect(transformAnswer(item)).toBe(expected)
    }
  })

  test('substituting the answer for the object leaves no stray preposition object', () => {
    // After replacement the original object phrase is gone exactly once.
    for (const item of DA_TRANSFORM) {
      const replaced = item.sentence.replace(item.object, transformAnswer(item))
      expect(replaced).not.toContain(item.object)
      expect(replaced).not.toBe(item.sentence)
    }
  })

  const mk = (o: Partial<TransformItem>): TransformItem => ({
    id: 'x', collocationId: 'warten-auf', sentence: '___', object: 'x',
    objectKind: 'thing', level: 'B1', ...o,
  })

  test('spot check: thing warten-auf -> "darauf"', () => {
    expect(transformAnswer(mk({ objectKind: 'thing' }))).toBe('darauf')
  })

  test('spot check: person warten-auf + er -> "auf ihn" (accusative)', () => {
    expect(transformAnswer(mk({ objectKind: 'person', personCue: 'er' }))).toBe('auf ihn')
  })

  test('spot check: person sich-treffen-mit + er -> "mit ihm" (dative)', () => {
    expect(
      transformAnswer(mk({ collocationId: 'sich-treffen-mit', objectKind: 'person', personCue: 'er' })),
    ).toBe('mit ihm')
  })

  test('throws on an unknown collocationId', () => {
    expect(() => transformAnswer(mk({ collocationId: 'does-not-exist' }))).toThrow()
  })
})
