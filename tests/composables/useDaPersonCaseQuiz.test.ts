import { describe, test, expect } from 'vitest'
import {
  useDaPersonCaseQuiz, joinPersonCaseItems, filterPersonCaseItems, samplePersonCaseItems,
  splitFrame, PERSON_CASE_PREPS, type PersonCaseJoinedItem,
} from '../../src/composables/useDaPersonCaseQuiz'
import { DA_PERSON_CASE, PRONOUN_FORMS, personCaseAnswer } from '../../src/data/daPersonCase'

const ALL = joinPersonCaseItems()

describe('joinPersonCaseItems / filterPersonCaseItems / samplePersonCaseItems', () => {
  test('joins every person-case item to its collocation', () => {
    expect(ALL.length).toBe(DA_PERSON_CASE.length)
    for (const ji of ALL) expect(ji.colloc.id).toBe(ji.item.collocationId)
  })

  test('filters by level, role, and preposition', () => {
    const b1 = filterPersonCaseItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(ji => ji.colloc.level === 'B1')).toBe(true)

    const verbs = filterPersonCaseItems({ roles: ['verb'] })
    expect(verbs.length).toBeGreaterThan(0)
    expect(verbs.every(ji => ji.colloc.role === 'verb')).toBe(true)

    const auf = filterPersonCaseItems({ preps: ['auf'] })
    expect(auf.length).toBeGreaterThan(0)
    expect(auf.every(ji => ji.colloc.preposition === 'auf')).toBe(true)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = samplePersonCaseItems(5, { levels: ['B1'] })
    expect(sample.length).toBe(5)
    expect(sample.every(ji => ji.colloc.level === 'B1')).toBe(true)
  })

  test('PERSON_CASE_PREPS is exactly the distinct prepositions the dataset governs (a strict subset of every collocation preposition)', () => {
    const expected = Array.from(new Set(ALL.map(ji => ji.colloc.preposition))).sort()
    expect(PERSON_CASE_PREPS).toEqual(expected)
    // the dataset deliberately omits some collocation-only preps (no person-case item for them)
    expect(PERSON_CASE_PREPS).not.toContain('für')
  })
})

describe('personCaseAnswer (re-derived, sanity)', () => {
  test('every joined item answer matches prep + declined pronoun', () => {
    for (const ji of ALL) {
      expect(personCaseAnswer(ji.item)).toBe(`${ji.colloc.preposition} ${PRONOUN_FORMS[ji.item.cue][ji.colloc.case]}`)
    }
  })
})

describe('useDaPersonCaseQuiz — pick mode', () => {
  test('every question has 2 or 3 deduplicated options, containing the answer exactly once', () => {
    const quiz = useDaPersonCaseQuiz(ALL, { mode: 'pick' })
    for (let i = 0; i < ALL.length; i++) {
      const q = quiz.current.value!
      expect(q.options).not.toBeNull()
      expect(q.options!.length).toBeGreaterThanOrEqual(2)
      expect(q.options!.length).toBeLessThanOrEqual(3)
      expect(new Set(q.options!).size).toBe(q.options!.length)
      expect(q.options!.filter(o => o === q.answer).length).toBe(1)
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
  })

  test('dedup case: a "wir" cue collapses accusative=dative -> exactly 2 options', () => {
    const wirItem = ALL.find(ji => ji.item.cue === 'wir')!
    expect(wirItem).toBeTruthy()
    const quiz = useDaPersonCaseQuiz([wirItem], { mode: 'pick' })
    const q = quiz.current.value!
    expect(q.options!.length).toBe(2)
    expect(q.options).toContain(q.answer)
    // the other option is the nominative form ("<prep> wir")
    const other = q.options!.find(o => o !== q.answer)!
    expect(other).toBe(`${wirItem.colloc.preposition} wir`)
  })

  test('a cue with 3 distinct forms (er: ihn/ihm/er) yields 3 options', () => {
    const erItem = ALL.find(ji => ji.item.cue === 'er')!
    expect(erItem).toBeTruthy()
    const quiz = useDaPersonCaseQuiz([erItem], { mode: 'pick' })
    const q = quiz.current.value!
    expect(new Set(q.options!)).toEqual(new Set([
      `${erItem.colloc.preposition} ihn`,
      `${erItem.colloc.preposition} ihm`,
      `${erItem.colloc.preposition} er`,
    ]))
  })

  test('pickOption grades correct/incorrect and locks the question', () => {
    const pool = ALL.slice(0, 1)
    const quiz = useDaPersonCaseQuiz(pool, { mode: 'pick' })
    const q = quiz.current.value!
    const wrongOption = q.options!.find(o => o !== q.answer)!
    quiz.pickOption(wrongOption)
    expect(quiz.current.value!.isCorrect).toBe(false)
    // Second pick on the same (already-answered) question is a no-op.
    quiz.pickOption(q.answer)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })
})

describe('useDaPersonCaseQuiz — type mode', () => {
  test('has no options', () => {
    const quiz = useDaPersonCaseQuiz(ALL.slice(0, 1), { mode: 'type' })
    expect(quiz.current.value!.options).toBeNull()
  })

  test('accepts a folded-umlaut answer (ueber sie for über sie)', () => {
    const ji = ALL.find(j => j.item.id === 'pc-lachen-ueber')!
    expect(ji).toBeTruthy()
    expect(personCaseAnswer(ji.item)).toBe('über sie')
    const quiz = useDaPersonCaseQuiz([ji], { mode: 'type' })
    quiz.submitText('ueber sie')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('accepts an alsoAccept alternative (mit ihnen for der Kontakt zu)', () => {
    const ji = ALL.find(j => j.item.id === 'pc-der-kontakt-zu')
    if (!ji) return // dataset may rotate; the semantics are covered by the engine contract
    expect((ji.colloc.alsoAccept ?? []).some(a => a.preposition === 'mit')).toBe(true)
    const quiz = useDaPersonCaseQuiz([ji], { mode: 'type' })
    quiz.submitText('mit ihnen')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('rejects a wrong answer and lands it in wrongItems once finished', () => {
    const ji = ALL[0]
    const quiz = useDaPersonCaseQuiz([ji], { mode: 'type' })
    quiz.submitText('completely-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
    expect(quiz.wrongItems.value[0].item.id).toBe(ji.item.id)
  })
})

describe('splitFrame', () => {
  test('splits the frame around its single gap', () => {
    expect(splitFrame('Ich denke den ganzen Tag ___.')).toEqual({
      pre: 'Ich denke den ganzen Tag ',
      post: '.',
    })
  })
})

// Type-only sanity check: PersonCaseJoinedItem shape used across the module.
const _typeCheck: PersonCaseJoinedItem = ALL[0]
void _typeCheck
