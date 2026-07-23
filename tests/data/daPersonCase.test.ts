import { describe, test, expect } from 'vitest'
import {
  DA_PERSON_CASE,
  PRONOUN_FORMS,
  personCaseAnswer,
  type PronounCue,
} from '../../src/data/daPersonCase'
import { COLLOCATIONS } from '../../src/data/collocations'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

const CUES: PronounCue[] = [
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie (Plural)', 'Sie',
]

describe('PRONOUN_FORMS', () => {
  test('has an accusative and dative form for all nine cues', () => {
    for (const cue of CUES) {
      expect(PRONOUN_FORMS[cue]).toBeDefined()
      expect(typeof PRONOUN_FORMS[cue].accusative).toBe('string')
      expect(typeof PRONOUN_FORMS[cue].dative).toBe('string')
    }
    expect(Object.keys(PRONOUN_FORMS).sort()).toEqual([...CUES].sort())
  })
})

describe('DA_PERSON_CASE invariants', () => {
  test("cue 'es' never pairs with an accusative collocation (*auf es is ungrammatical)", () => {
    const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))
    const bad = DA_PERSON_CASE.filter(i => i.cue === 'es' && byId.get(i.collocationId)!.case === 'accusative')
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('at least 50 items with unique ids and one item per collocation', () => {
    expect(DA_PERSON_CASE.length).toBeGreaterThanOrEqual(50)
    expect(new Set(DA_PERSON_CASE.map(i => i.id)).size).toBe(DA_PERSON_CASE.length)
    expect(new Set(DA_PERSON_CASE.map(i => i.collocationId)).size).toBe(DA_PERSON_CASE.length)
  })

  test('ids follow the pc-<collocationId> convention', () => {
    const bad = DA_PERSON_CASE.filter(i => i.id !== `pc-${i.collocationId}`)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item joins a real collocation and matches its level', () => {
    const bad = DA_PERSON_CASE.filter(
      i => !byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level,
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every cue is one of the nine known cues', () => {
    const bad = DA_PERSON_CASE.filter(i => !CUES.includes(i.cue))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('frame has exactly one gap', () => {
    const bad = DA_PERSON_CASE.filter(i => (i.frame.match(/___/g) ?? []).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('frame never contains the collocation preposition as a word', () => {
    const bad = DA_PERSON_CASE.filter(i => {
      const prep = byId.get(i.collocationId)!.preposition
      const words = i.frame.toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean)
      return words.includes(prep)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every cue is used at least twice and all nine appear', () => {
    for (const cue of CUES) {
      const n = DA_PERSON_CASE.filter(i => i.cue === cue).length
      expect(n, `cue "${cue}"`).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('personCaseAnswer', () => {
  test('answer = preposition + the cue pronoun in the collocation case', () => {
    for (const item of DA_PERSON_CASE) {
      const c = byId.get(item.collocationId)!
      expect(personCaseAnswer(item)).toBe(`${c.preposition} ${PRONOUN_FORMS[item.cue][c.case]}`)
    }
  })

  test('spot check: warten-auf + er -> "auf ihn" (accusative)', () => {
    expect(
      personCaseAnswer({ id: 'x', collocationId: 'warten-auf', frame: '___', cue: 'er', level: 'B1' }),
    ).toBe('auf ihn')
  })

  test('spot check: sich-treffen-mit + er -> "mit ihm" (dative)', () => {
    expect(
      personCaseAnswer({ id: 'x', collocationId: 'sich-treffen-mit', frame: '___', cue: 'er', level: 'B1' }),
    ).toBe('mit ihm')
  })

  test('spot check: gehoeren-zu + wir -> "zu uns" (dative)', () => {
    expect(
      personCaseAnswer({ id: 'x', collocationId: 'gehoeren-zu', frame: '___', cue: 'wir', level: 'B1' }),
    ).toBe('zu uns')
  })

  test('throws on an unknown collocationId', () => {
    expect(() =>
      personCaseAnswer({ id: 'x', collocationId: 'does-not-exist', frame: '___', cue: 'er', level: 'B1' }),
    ).toThrow()
  })
})
