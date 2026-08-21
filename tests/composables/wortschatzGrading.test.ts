import { describe, it, expect } from 'vitest'
import { gradeAgainst, gradeVokabelAnswer, normalizeAnswer } from '../../src/composables/wortschatzGrading'

describe('wortschatzGrading', () => {
  it('normalizes whitespace/case, equates ß and ss, keeps umlauts', () => {
    expect(normalizeAnswer('  die  Maßnahme ')).toBe('die massnahme')
    expect(normalizeAnswer('die Massnahme')).toBe('die massnahme')
    expect(normalizeAnswer('die Mahnahme')).not.toBe('die massnahme')
    expect(normalizeAnswer('über')).toBe('über') // umlauts NOT folded
  })

  it('exact and variant matches are correct', () => {
    expect(gradeAgainst('eine Maßnahme ergreifen', 'eine  maßnahme ergreifen').correct).toBe(true)
    const v = { de: 'eine Maßnahme ergreifen', variants: ['Maßnahmen ergreifen'] }
    expect(gradeVokabelAnswer(v, v.de, 'Maßnahmen ergreifen').correct).toBe(true)
    expect(gradeVokabelAnswer(v, v.de, 'schnell handeln').correct).toBe(false)
  })

  it('article slips are wrong with reason article', () => {
    const r = gradeAgainst('die Maßnahme', 'der Maßnahme')
    expect(r.correct).toBe(false)
    expect(r.reason).toBe('article')
  })

  it('preposition slips are wrong with reason preposition', () => {
    const r = gradeAgainst('auf etwas angewiesen sein', 'an etwas angewiesen sein')
    expect(r.correct).toBe(false)
    expect(r.reason).toBe('preposition')
  })

  it('ending slips are wrong even at Levenshtein 1', () => {
    const r = gradeAgainst('Maßnahmen ergreifen', 'Maßnahmen ergreifem')
    expect(r.correct).toBe(false)
    expect(r.reason).toBe('ending')
  })

  it('a 1-char typo mid-word in a long word is forgiven', () => {
    expect(gradeAgainst('die Verpackung', 'die Verpakung').correct).toBe(true)   // deletion mid-word
    expect(gradeAgainst('die Verpackung', 'die Ferpackung').correct).toBe(true)  // substitution at start
  })

  it('short words get no typo tolerance', () => {
    expect(gradeAgainst('der Müll', 'der Mull').correct).toBe(false)
  })

  it('learned variants are accepted', () => {
    const v = { de: 'eine Maßnahme ergreifen', variants: [] }
    expect(gradeVokabelAnswer(v, v.de, 'zu einer Maßnahme greifen', ['zu einer Maßnahme greifen']).correct).toBe(true)
  })

  it('token-count mismatch and empty input are wrong', () => {
    expect(gradeAgainst('die Maßnahme', 'Maßnahme').reason).toBe('word')
    expect(gradeAgainst('die Maßnahme', '  ').reason).toBe('empty')
  })
})
