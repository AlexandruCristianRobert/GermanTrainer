import { describe, test, expect } from 'vitest'
import {
  DA_PARAPHRASE,
  paraphraseAnswers,
  type ParaphraseItem,
} from '../../src/data/daParaphrase'
import { COLLOCATIONS } from '../../src/data/collocations'
import { daCompound } from '../../src/data/daCompounds'

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

const hasClauseMarker = (s: string) =>
  /,\s*(dass|ob|wie|warum|wann|was|wer|wo|welch)/.test(s) || /,[^,]*\bzu\b\s/.test(s)

describe('DA_PARAPHRASE invariants', () => {
  test('at least 40 items with unique ids, one per collocation', () => {
    expect(DA_PARAPHRASE.length).toBeGreaterThanOrEqual(40)
    expect(new Set(DA_PARAPHRASE.map(i => i.id)).size).toBe(DA_PARAPHRASE.length)
    expect(new Set(DA_PARAPHRASE.map(i => i.collocationId)).size).toBe(DA_PARAPHRASE.length)
  })

  test('ids follow the pp-<collocationId> convention', () => {
    const bad = DA_PARAPHRASE.filter(i => i.id !== `pp-${i.collocationId}`)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('every item joins a real collocation and matches its level', () => {
    const bad = DA_PARAPHRASE.filter(
      i => !byId.has(i.collocationId) || byId.get(i.collocationId)!.level !== i.level,
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('nounSentence has exactly one gap (the bare preposition slot)', () => {
    const bad = DA_PARAPHRASE.filter(i => (i.nounSentence.match(/___/g) ?? []).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('clauseSentence has exactly one gap and a following clause marker', () => {
    const bad = DA_PARAPHRASE.filter(
      i =>
        (i.clauseSentence.match(/___/g) ?? []).length !== 1 || !hasClauseMarker(i.clauseSentence),
    )
    expect(bad.map(i => i.id)).toEqual([])
  })

  // Neither sentence may leak the other's derived answer.
  test('nounSentence never contains its prep as a standalone word; neither sentence contains the korrelat', () => {
    const bad = DA_PARAPHRASE.filter(i => {
      const { prep, korrelat } = paraphraseAnswers(i)
      const prepAsWord = new RegExp(`\\b${prep}\\b`, 'i')
      return (
        prepAsWord.test(i.nounSentence) ||
        i.nounSentence.toLowerCase().includes(korrelat.toLowerCase()) ||
        i.clauseSentence.toLowerCase().includes(korrelat.toLowerCase())
      )
    })
    expect(bad.map(i => i.id)).toEqual([])
  })
})

describe('paraphraseAnswers', () => {
  test('{ prep: bare preposition, korrelat: da-compound } of the joined collocation', () => {
    for (const item of DA_PARAPHRASE) {
      const c = byId.get(item.collocationId)!
      expect(paraphraseAnswers(item)).toEqual({
        prep: c.preposition,
        korrelat: daCompound(c.preposition),
      })
    }
  })

  test('spot check: sich-kuemmern-um -> { prep: "um", korrelat: "darum" }', () => {
    const item = DA_PARAPHRASE.find(i => i.collocationId === 'sich-kuemmern-um')!
    expect(paraphraseAnswers(item)).toEqual({ prep: 'um', korrelat: 'darum' })
  })

  test('spot check: sich-freuen-ueber -> { prep: "über", korrelat: "darüber" }', () => {
    const item = DA_PARAPHRASE.find(i => i.collocationId === 'sich-freuen-ueber')!
    expect(paraphraseAnswers(item)).toEqual({ prep: 'über', korrelat: 'darüber' })
  })

  test('throws on an unknown collocationId', () => {
    expect(() =>
      paraphraseAnswers({
        id: 'pp-x', collocationId: 'does-not-exist',
        nounSentence: 'Ich ___ x.', clauseSentence: 'Ich ___, dass', level: 'B1',
      } as ParaphraseItem),
    ).toThrow()
  })
})
