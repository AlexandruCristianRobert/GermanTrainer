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

  it('blankVariants are accepted in cloze mode (expectedText !== v.de)', () => {
    const v = { de: 'Müll trennen', variants: ['den Müll trennen'] }
    const blank = 'Müll trennt' // the cloze blank, an inflected form — not v.de
    // without blankVariants the canonical article version is (correctly) rejected
    expect(gradeVokabelAnswer(v, blank, 'den Müll trennt').correct).toBe(false)
    // with the sentence-specific variant it is accepted
    expect(gradeVokabelAnswer(v, blank, 'den Müll trennt', undefined, ['den Müll trennt']).correct).toBe(true)
  })

  it('blankVariants do not loosen the strict core', () => {
    const v = { de: 'eine Maßnahme ergreifen', variants: ['Maßnahmen ergreifen'] }
    const blank = 'Maßnahmen ergreifen'
    // an article slip inside the blankVariant candidate still fails that candidate
    const r = gradeVokabelAnswer(v, blank, 'einen Maßnahme ergreifen', undefined, ['eine Maßnahme ergreifen'])
    expect(r.correct).toBe(false)
    expect(r.reason).toBe('word') // the primary result against the blank still stands
    // and a preposition slip inside a candidate is not forgiven either
    const p = gradeVokabelAnswer(
      { de: 'über ein Thema berichten', variants: [] },
      'über ein Thema zu berichten',
      'für Themen zu berichten',
      undefined,
      ['über Themen zu berichten']
    )
    expect(p.correct).toBe(false)
  })

  it('absent or empty blankVariants leave behavior unchanged', () => {
    const v = { de: 'eine Maßnahme ergreifen', variants: ['Maßnahmen ergreifen'] }
    expect(gradeVokabelAnswer(v, 'eine Maßnahme ergriffen', 'eine Maßnahme ergriffen').correct).toBe(true)
    expect(gradeVokabelAnswer(v, 'eine Maßnahme ergriffen', 'eine Maßnahme ergriffen', [], []).correct).toBe(true)
    expect(gradeVokabelAnswer(v, 'eine Maßnahme ergriffen', 'Maßnahmen ergriffen', [], []).correct).toBe(false)
    // the v.de path (variants + learnedVariants) is untouched when blankVariants are empty
    expect(gradeVokabelAnswer(v, v.de, 'Maßnahmen ergreifen', undefined, []).correct).toBe(true)
  })

  it('token-count mismatch and empty input are wrong', () => {
    expect(gradeAgainst('die Maßnahme', 'Maßnahme').reason).toBe('word')
    expect(gradeAgainst('die Maßnahme', '  ').reason).toBe('empty')
  })
})
