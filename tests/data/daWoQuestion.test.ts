import { describe, test, expect } from 'vitest'
import {
  DA_WO_QUESTION,
  PERSON_QUESTION,
  woQuestionAnswer,
  type WoQuestionItem,
} from '../../src/data/daWoQuestion'
import { COLLOCATIONS } from '../../src/data/collocations'
import { woCompound } from '../../src/data/daCompounds'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// The preposition must show up in the statement; contractions count.
const CONTRACTIONS: Record<string, string[]> = {
  an: ['am', 'ans'], auf: ['aufs'], in: ['im', 'ins'], von: ['vom'],
  zu: ['zum', 'zur'], für: ['fürs'], um: ['ums'], über: ['übers'], vor: ['vorm'],
}

describe('PERSON_QUESTION', () => {
  test('maps accusative -> wen, dative -> wem', () => {
    expect(PERSON_QUESTION).toEqual({ accusative: 'wen', dative: 'wem' })
  })
})

describe('DA_WO_QUESTION invariants', () => {
  test('at least 50 items with unique ids and one item per collocation', () => {
    expect(DA_WO_QUESTION.length).toBeGreaterThanOrEqual(50)
    expect(new Set(DA_WO_QUESTION.map(i => i.id)).size).toBe(DA_WO_QUESTION.length)
    expect(new Set(DA_WO_QUESTION.map(i => i.collocationId)).size).toBe(DA_WO_QUESTION.length)
  })

  test('kind floors: at least 30 thing and 18 person items', () => {
    expect(DA_WO_QUESTION.filter(i => i.objectKind === 'thing').length).toBeGreaterThanOrEqual(30)
    expect(DA_WO_QUESTION.filter(i => i.objectKind === 'person').length).toBeGreaterThanOrEqual(18)
  })

  test('ids follow the wq-<collocationId> convention', () => {
    const bad = DA_WO_QUESTION.filter(i => i.id !== `wq-${i.collocationId}`)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item joins a real collocation and matches its level', () => {
    const bad = DA_WO_QUESTION.filter(
      i => !byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level,
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('objectKind is always thing or person', () => {
    const bad = DA_WO_QUESTION.filter(i => i.objectKind !== 'thing' && i.objectKind !== 'person')
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('scaffold has exactly one gap and the gap is first', () => {
    const bad = DA_WO_QUESTION.filter(
      i => (i.scaffold.match(/___/g) ?? []).length !== 1 || !i.scaffold.startsWith('___ '),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('scaffold is a question (ends with ?)', () => {
    const bad = DA_WO_QUESTION.filter(i => !i.scaffold.trim().endsWith('?'))
    expect(bad.map(i => i.id)).toEqual([])
  })

  // The preposition belongs to the ANSWER (wovor / vor wem), so it must never
  // appear as a word in the scaffold itself.
  test('scaffold never contains the collocation preposition as a word', () => {
    const bad = DA_WO_QUESTION.filter(i => {
      const prep = byId.get(i.collocationId)!.preposition
      const words = i.scaffold.toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean)
      return words.includes(prep) || (CONTRACTIONS[prep] ?? []).some(c => words.includes(c))
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('statement uses the preposition (incl. common contractions)', () => {
    const bad = DA_WO_QUESTION.filter(i => {
      const prep = byId.get(i.collocationId)!.preposition
      const words = i.statement.toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean)
      return !(words.includes(prep) || (CONTRACTIONS[prep] ?? []).some(c => words.includes(c)))
    })
    expect(bad.map(i => i.id)).toEqual([])
  })
})

describe('woQuestionAnswer', () => {
  test('thing -> capitalized wo-compound; person -> capitalized prep + wen/wem', () => {
    for (const item of DA_WO_QUESTION) {
      const c = byId.get(item.collocationId)!
      const expected =
        item.objectKind === 'thing'
          ? cap(woCompound(c.preposition))
          : `${cap(c.preposition)} ${PERSON_QUESTION[c.case]}`
      expect(woQuestionAnswer(item)).toBe(expected)
    }
  })

  test('filling the gap with the answer never duplicates the answer', () => {
    const bad = DA_WO_QUESTION.filter(i =>
      i.scaffold.toLowerCase().includes(woQuestionAnswer(i).toLowerCase()),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  const mk = (o: Partial<WoQuestionItem>): WoQuestionItem => ({
    id: 'x', collocationId: 'warten-auf', statement: 'x', scaffold: '___ ?',
    objectKind: 'thing', level: 'B1', ...o,
  })

  test('spot check: thing sich-fuerchten-vor -> "Wovor"', () => {
    expect(woQuestionAnswer(mk({ collocationId: 'sich-fuerchten-vor', objectKind: 'thing' }))).toBe('Wovor')
  })

  test('spot check: thing warten-auf -> "Worauf"', () => {
    expect(woQuestionAnswer(mk({ objectKind: 'thing' }))).toBe('Worauf')
  })

  test('spot check: person warten-auf -> "Auf wen" (accusative)', () => {
    expect(woQuestionAnswer(mk({ objectKind: 'person' }))).toBe('Auf wen')
  })

  test('spot check: person sich-treffen-mit -> "Mit wem" (dative)', () => {
    expect(
      woQuestionAnswer(mk({ collocationId: 'sich-treffen-mit', objectKind: 'person' })),
    ).toBe('Mit wem')
  })

  test('throws on an unknown collocationId', () => {
    expect(() => woQuestionAnswer(mk({ collocationId: 'does-not-exist' }))).toThrow()
  })
})
