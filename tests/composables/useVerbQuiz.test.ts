import { describe, it, expect } from 'vitest'
import {
  useTranslationQuiz,
  useConjugationQuiz,
  checkTranslation,
  checkConjugation
} from '../../src/composables/useVerbQuiz'
import type { Verb } from '../../src/data/verbs'

const fixture: Verb[] = [
  {
    german: 'aufstehen', english: 'get up / stand up',
    level: 'A1', type: 'separable', case: 'none', auxiliary: 'sein',
    separablePrefix: 'auf',
    praesens: ['stehe auf', 'stehst auf', 'steht auf', 'stehen auf', 'steht auf', 'stehen auf'],
    praeteritumStem: 'stand', partizip2: 'aufgestanden'
  }
]

describe('useTranslationQuiz', () => {
  it('accepts answer without "to"', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('get up')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('accepts answer with leading "to"', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('to stand up')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('accepts case-insensitive and trimmed', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('  GET UP  ')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('rejects incorrect form', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('getting up')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })

  it('rejects empty', () => {
    const q = useTranslationQuiz(fixture)
    q.submit('')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })

  it('accepts any one of a slash-separated alternative list', () => {
    const multi: Verb[] = [{
      german: 'fahren', english: 'drive / go / travel',
      level: 'A1', type: 'irregular', case: 'varies', auxiliary: 'sein',
      praesens: ['fahre','fährst','fährt','fahren','fahrt','fahren'],
      praeteritumStem: 'fuhr', partizip2: 'gefahren'
    }]
    // Each alternative independently
    for (const ans of ['drive', 'go', 'travel', 'to drive', 'to go', 'to travel']) {
      const q = useTranslationQuiz(multi)
      q.submit(ans)
      expect(q.questions.value[0].isCorrect, `"${ans}" should match`).toBe(true)
    }
  })
})

describe('checkTranslation — parentheticals', () => {
  it('matches the bare word even when canonical has a "(…)" disambiguator', () => {
    expect(checkTranslation('know', 'know (a fact)')).toBe(true)
    expect(checkTranslation('to know', 'know (a fact)')).toBe(true)
    expect(checkTranslation('KNOW', 'know (a fact)')).toBe(true)
  })

  it('accepts the user typing their own "(…)" disambiguator', () => {
    expect(checkTranslation('know (something)', 'know (a fact)')).toBe(true)
  })

  it('still rejects an unrelated answer', () => {
    expect(checkTranslation('forget', 'know (a fact)')).toBe(false)
  })

  it('strips parens before splitting on / so each alternative matches its bare word', () => {
    const canonical = 'know (a fact) / know (a person)'
    expect(checkTranslation('know', canonical)).toBe(true)
  })

  it('handles trailing whitespace left after stripping parens', () => {
    expect(checkTranslation('see', '  see (someone)  ')).toBe(true)
  })
})

describe('verb dataset — parenthetical hygiene', () => {
  it('no english field contains "(...)" — typing one word is enough to match', async () => {
    const { VERBS } = await import('../../src/data/verbs')
    const offenders = VERBS.filter(v => /\([^)]*\)/.test(v.english))
    expect(offenders).toEqual([])
  })
})

describe('checkConjugation — normalization', () => {
  it('accepts exact', () => {
    expect(checkConjugation('habe gespielt', 'habe gespielt')).toBe(true)
  })
  it('accepts whitespace and case differences', () => {
    expect(checkConjugation('  HABE   gespielt ', 'habe gespielt')).toBe(true)
  })
  it('accepts user-typed pronoun prefix', () => {
    expect(checkConjugation('ich habe gespielt', 'habe gespielt', 'ich')).toBe(true)
    expect(checkConjugation('er ist gegangen', 'ist gegangen', 'er/sie/es')).toBe(true)
  })
  it('rejects umlaut substitutions', () => {
    expect(checkConjugation('laufst', 'läufst')).toBe(false)
    expect(checkConjugation('laeufst', 'läufst')).toBe(false)
  })
  it('rejects wrong form', () => {
    expect(checkConjugation('habe spielen', 'habe gespielt')).toBe(false)
  })
})

describe('useConjugationQuiz', () => {
  const spielen: Verb[] = [
    {
      german: 'spielen', english: 'play',
      level: 'A1', type: 'regular', case: 'accusative', auxiliary: 'haben',
      praesens: ['spiele','spielst','spielt','spielen','spielt','spielen'],
      praeteritumStem: 'spielte', partizip2: 'gespielt'
    }
  ]

  it('builds questions as verb×tense cross-product', () => {
    const q = useConjugationQuiz(spielen, ['praesens', 'perfekt'])
    expect(q.questions.value.length).toBe(2)
    expect(q.questions.value[0].rows.length).toBe(6)
  })

  it('imperativ produces 3 rows', () => {
    const q = useConjugationQuiz(spielen, ['imperativ'])
    expect(q.questions.value[0].rows.length).toBe(3)
  })

  it('submit grades each row', () => {
    const q = useConjugationQuiz(spielen, ['praesens'])
    q.submit(['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'WRONG'])
    expect(q.questions.value[0].rowCorrect).toEqual([true, true, true, true, true, false])
    expect(q.questions.value[0].correctCount).toBe(5)
  })

  it('skip marks all rows incorrect and advances', () => {
    const q = useConjugationQuiz(spielen, ['praesens'])
    q.skip()
    expect(q.questions.value[0].rowCorrect.every(c => c === false)).toBe(true)
    expect(q.currentIndex.value).toBe(1)
  })

  it('aggregate score across rows', () => {
    const q = useConjugationQuiz(spielen, ['praesens', 'perfekt'])
    q.submit(['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen']); q.advance()
    q.submit(['habe gespielt', 'hast gespielt', 'hat gespielt', 'haben gespielt', 'habt gespielt', 'haben gespielt']); q.advance()
    expect(q.totalRows.value).toBe(12)
    expect(q.correctRows.value).toBe(12)
  })
})
