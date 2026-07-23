import { describe, test, expect } from 'vitest'
import {
  useDaArticleQuiz, joinArticleItems, filterArticleItems, sampleArticleItems,
  splitArticleGap, articleStub, isAnDativeException, ARTICLE_PREPS, type ArticleJoinedItem,
} from '../../src/composables/useDaArticleQuiz'
import { DA_ARTICLE_FILL, TWO_WAY_PREPS, articleFillAnswer } from '../../src/data/daArticleFill'

const ALL = joinArticleItems()

describe('joinArticleItems / filterArticleItems / sampleArticleItems', () => {
  test('joins every article-fill item to its collocation', () => {
    expect(ALL.length).toBe(DA_ARTICLE_FILL.length)
    for (const ji of ALL) expect(ji.colloc.id).toBe(ji.item.collocationId)
  })

  test('filters by level and preposition — the brief omits a roles filter for T7', () => {
    const b1 = filterArticleItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(ji => ji.colloc.level === 'B1')).toBe(true)

    const an = filterArticleItems({ preps: ['an'] })
    expect(an.length).toBeGreaterThan(0)
    expect(an.every(ji => ji.colloc.preposition === 'an')).toBe(true)
  })

  test('a level+prep combo with zero matches filters to empty (B1 + unter)', () => {
    expect(filterArticleItems({ levels: ['B1'], preps: ['unter'] })).toEqual([])
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleArticleItems(5, { levels: ['B1'] })
    expect(sample.length).toBeLessThanOrEqual(5)
    expect(sample.every(ji => ji.colloc.level === 'B1')).toBe(true)
  })

  test('ARTICLE_PREPS is exactly the distinct prepositions the dataset governs, all two-way', () => {
    const expected = Array.from(new Set(ALL.map(ji => ji.colloc.preposition))).sort()
    expect(ARTICLE_PREPS).toEqual(expected)
    expect(ARTICLE_PREPS.every(p => (TWO_WAY_PREPS as readonly string[]).includes(p))).toBe(true)
  })
})

describe('isAnDativeException', () => {
  test('true for an + Dativ — the drilled exception', () => {
    const anDativ = ALL.find(ji => ji.colloc.preposition === 'an' && ji.colloc.case === 'dative')!
    expect(anDativ).toBeTruthy()
    expect(isAnDativeException(anDativ.colloc)).toBe(true)
  })

  test('false for an + Akkusativ (the usual case for "an")', () => {
    const anAkk = ALL.find(ji => ji.colloc.preposition === 'an' && ji.colloc.case === 'accusative')!
    expect(anAkk).toBeTruthy()
    expect(isAnDativeException(anAkk.colloc)).toBe(false)
  })

  test('false for a Dativ exception under a DIFFERENT preposition (e.g. leiden unter)', () => {
    const otherDativ = ALL.find(ji => ji.colloc.preposition !== 'an' && ji.colloc.case === 'dative')!
    expect(otherDativ).toBeTruthy()
    expect(isAnDativeException(otherDativ.colloc)).toBe(false)
  })
})

describe('useDaArticleQuiz — answer derivation', () => {
  test('every question answer matches articleFillAnswer(item); hintCase/isAnDativeException mirror the joined collocation', () => {
    const quiz = useDaArticleQuiz(ALL)
    for (let i = 0; i < ALL.length; i++) {
      const q = quiz.current.value!
      expect(q.answer).toBe(articleFillAnswer(q.item))
      expect(q.hintCase).toBe(q.colloc.case)
      expect(q.isAnDativeException).toBe(q.colloc.preposition === 'an' && q.colloc.case === 'dative')
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
  })

  test('spot check: arbeiten-an (Dativ, an-exception) + indefinite/neuter -> "einem"', () => {
    const ji = ALL.find(j => j.item.id === 'af-arbeiten-an')!
    const quiz = useDaArticleQuiz([ji])
    expect(quiz.current.value!.answer).toBe('einem')
    expect(quiz.current.value!.isAnDativeException).toBe(true)
  })

  test('spot check: denken-an (Akkusativ, usual) + definite/masculine -> "den"', () => {
    const ji = ALL.find(j => j.item.id === 'af-denken-an')!
    const quiz = useDaArticleQuiz([ji])
    expect(quiz.current.value!.answer).toBe('den')
    expect(quiz.current.value!.isAnDativeException).toBe(false)
  })
})

describe('useDaArticleQuiz — grading (type-only)', () => {
  test('accepts an exact-case match and grades correct', () => {
    const ji = ALL.find(j => j.item.id === 'af-warten-auf')!
    const quiz = useDaArticleQuiz([ji])
    expect(articleFillAnswer(ji.item)).toBe('den')
    quiz.submitText('den')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('grading is case-insensitive (DEN matches den)', () => {
    const ji = ALL.find(j => j.item.id === 'af-warten-auf')!
    const quiz = useDaArticleQuiz([ji])
    quiz.submitText('DEN')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('rejects a wrong article and lands it in wrongItems once finished', () => {
    const ji = ALL[0]
    const quiz = useDaArticleQuiz([ji])
    quiz.submitText('completely-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
    expect(quiz.wrongItems.value[0].item.id).toBe(ji.item.id)
  })

  test('a second submitText on an already-graded question is a no-op', () => {
    const ji = ALL[0]
    const quiz = useDaArticleQuiz([ji])
    quiz.submitText('completely-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.submitText(articleFillAnswer(ji.item))
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('empty/whitespace-only input never grades correct', () => {
    const ji = ALL[0]
    const quiz = useDaArticleQuiz([ji])
    quiz.submitText('   ')
    expect(quiz.current.value!.isCorrect).toBe(false)
  })
})

describe('articleStub / splitArticleGap', () => {
  test('articleStub is "d___" for definite items and "ein___" for indefinite items', () => {
    const def = ALL.find(ji => ji.item.article === 'definite')!
    const indef = ALL.find(ji => ji.item.article === 'indefinite')!
    expect(articleStub(def.item)).toBe('d___')
    expect(articleStub(indef.item)).toBe('ein___')
  })

  test('splits a definite-gap sentence around the WHOLE token, removing the stub entirely', () => {
    const ji = ALL.find(j => j.item.id === 'af-denken-an')!
    const { pre, post } = splitArticleGap(ji.item)
    expect(pre).toBe('Ich denke gern an ')
    expect(post).toBe(' Urlaub am Meer.')
    expect(pre + post).not.toContain('___')
  })

  test('splits an indefinite-gap sentence the same way', () => {
    const ji = ALL.find(j => j.item.id === 'af-arbeiten-an')!
    const { pre, post } = splitArticleGap(ji.item)
    expect(pre).toBe('Wir arbeiten seit Wochen an ')
    expect(post).toBe(' neuen Projekt.')
  })

  test('every item in the dataset splits cleanly: pre + stub + post reconstructs the original sentence', () => {
    for (const ji of ALL) {
      const stub = articleStub(ji.item)
      const { pre, post } = splitArticleGap(ji.item)
      expect(pre + stub + post).toBe(ji.item.sentence)
    }
  })
})

// Type-only sanity check: ArticleJoinedItem shape used across the module.
const _typeCheck: ArticleJoinedItem = ALL[0]
void _typeCheck
