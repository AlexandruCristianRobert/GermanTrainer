import { describe, test, expect } from 'vitest'
import {
  useDaSubstitutionQuiz, joinSubstitutionItems, filterSubstitutionItems, sampleSubstitutionItems,
  highlightContext, splitGap, SUBSTITUTION_PREPS, type JoinedItem,
} from '../../src/composables/useDaSubstitutionQuiz'
import { NEIGHBOR_PREPS, substitutionAnswer } from '../../src/data/daSubstitution'
import { daCompound } from '../../src/data/daCompounds'

const ALL = joinSubstitutionItems()

describe('joinSubstitutionItems / filterSubstitutionItems / sampleSubstitutionItems', () => {
  test('joins every substitution item to its collocation', () => {
    expect(ALL.length).toBeGreaterThan(0)
    for (const ji of ALL) expect(ji.colloc.id).toBe(ji.item.collocationId)
  })

  test('filters by level, role, and preposition', () => {
    const b1 = filterSubstitutionItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(ji => ji.colloc.level === 'B1')).toBe(true)

    const verbs = filterSubstitutionItems({ roles: ['verb'] })
    expect(verbs.length).toBeGreaterThan(0)
    expect(verbs.every(ji => ji.colloc.role === 'verb')).toBe(true)

    const auf = filterSubstitutionItems({ preps: ['auf'] })
    expect(auf.length).toBeGreaterThan(0)
    expect(auf.every(ji => ji.colloc.preposition === 'auf')).toBe(true)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleSubstitutionItems(5, { levels: ['B1'] })
    expect(sample.length).toBe(5)
    expect(sample.every(ji => ji.colloc.level === 'B1')).toBe(true)
  })

  test('SUBSTITUTION_PREPS covers every prep NEIGHBOR_PREPS knows about', () => {
    for (const p of SUBSTITUTION_PREPS) expect(NEIGHBOR_PREPS[p]).toBeDefined()
  })
})

describe('useDaSubstitutionQuiz — pick mode, random distractors', () => {
  test('every question has 4 options containing the answer + 3 unique distractors', () => {
    const pool = ALL.slice(0, 10)
    const quiz = useDaSubstitutionQuiz(pool, { mode: 'pick', distractors: 'random' })
    for (let i = 0; i < pool.length; i++) {
      const q = quiz.current.value!
      expect(q.options).not.toBeNull()
      expect(q.options!.length).toBe(4)
      expect(new Set(q.options)).toEqual(new Set(q.options)) // no throw on dupes below
      expect(new Set(q.options!).size).toBe(4)
      expect(q.options).toContain(q.answer)
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
  })

  test('falls back to all compoundable prepositions when the pool has <4 distinct compounds', () => {
    // Two items that share the same governing preposition ("auf") -> only 1 distinct
    // compound in the pool, well under the 4 needed to draw 3 OTHER distractors from it.
    const sameAnswer = ALL.filter(ji => ji.colloc.preposition === 'auf').slice(0, 2)
    expect(sameAnswer.length).toBe(2)
    const quiz = useDaSubstitutionQuiz(sameAnswer, { mode: 'pick', distractors: 'random' })
    const q = quiz.current.value!
    expect(q.options!.length).toBe(4)
    expect(new Set(q.options!).size).toBe(4)
    expect(q.options).toContain(q.answer)
  })

  test('pickOption grades correct/incorrect and locks the question', () => {
    const pool = ALL.slice(0, 1)
    const quiz = useDaSubstitutionQuiz(pool, { mode: 'pick', distractors: 'random' })
    const q = quiz.current.value!
    const wrongOption = q.options!.find(o => o !== q.answer)!
    quiz.pickOption(wrongOption)
    expect(quiz.current.value!.isCorrect).toBe(false)
    // Second pick on the same (already-answered) question is a no-op.
    quiz.pickOption(q.answer)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })
})

describe('useDaSubstitutionQuiz — pick mode, neighbors distractors', () => {
  test('options are exactly the answer plus the NEIGHBOR_PREPS compounds', () => {
    const pool = ALL.slice(0, 5)
    const quiz = useDaSubstitutionQuiz(pool, { mode: 'pick', distractors: 'neighbors' })
    for (const ji of pool) {
      const q = quiz.current.value!
      const expectedNeighbors = NEIGHBOR_PREPS[ji.colloc.preposition].map(daCompound)
      expect(new Set(q.options!)).toEqual(new Set([q.answer, ...expectedNeighbors]))
      quiz.advance()
    }
  })
})

describe('useDaSubstitutionQuiz — type mode', () => {
  test('has no options', () => {
    const quiz = useDaSubstitutionQuiz(ALL.slice(0, 1), { mode: 'type', distractors: 'random' })
    expect(quiz.current.value!.options).toBeNull()
  })

  test('accepts a folded-umlaut answer (darueber for darüber)', () => {
    const ji = ALL.find(j => substitutionAnswer(j.item) === 'darüber')!
    expect(ji).toBeTruthy()
    const quiz = useDaSubstitutionQuiz([ji], { mode: 'type', distractors: 'random' })
    quiz.submitText('darueber')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('rejects a wrong answer and lands it in wrongItems once finished', () => {
    const ji = ALL[0]
    const quiz = useDaSubstitutionQuiz([ji], { mode: 'type', distractors: 'random' })
    quiz.submitText('completely-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
    expect(quiz.wrongItems.value[0].item.id).toBe(ji.item.id)
  })
})

describe('highlightContext', () => {
  test('bolds a conjugated surface form of the collocation word', () => {
    const h = highlightContext('Wir freuen uns auf das lange Wochenende.', 'sich freuen')
    expect(h.match.toLowerCase()).toBe('freuen')
    expect(h.pre + h.match + h.post).toBe('Wir freuen uns auf das lange Wochenende.')
  })

  test('falls back gracefully (no match, no throw) for separable verbs', () => {
    const h = highlightContext('Er hört endlich mit dem Rauchen auf.', 'aufhören')
    expect(h.pre + h.match + h.post).toBe('Er hört endlich mit dem Rauchen auf.')
  })
})

describe('splitGap', () => {
  test('splits the stem around its single gap', () => {
    expect(splitGap('Ich warte schon viel zu lange ___.')).toEqual({
      pre: 'Ich warte schon viel zu lange ',
      post: '.',
    })
  })
})

// Type-only sanity check: JoinedItem shape used across the module.
const _typeCheck: JoinedItem = ALL[0]
void _typeCheck
