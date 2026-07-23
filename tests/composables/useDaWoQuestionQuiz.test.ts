import { describe, test, expect } from 'vitest'
import {
  useDaWoQuestionQuiz, joinWoQuestionItems, filterWoQuestionItems, sampleWoQuestionItems,
  splitWoScaffold, WO_QUESTION_PREPS, type WoJoinedItem,
} from '../../src/composables/useDaWoQuestionQuiz'
import { DA_WO_QUESTION, woQuestionAnswer, type WoQuestionItem } from '../../src/data/daWoQuestion'
import { COLLOCATIONS } from '../../src/data/collocations'

const ALL = joinWoQuestionItems()
const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

describe('joinWoQuestionItems / filterWoQuestionItems / sampleWoQuestionItems', () => {
  test('joins every wo-question item to its collocation', () => {
    expect(ALL.length).toBe(DA_WO_QUESTION.length)
    for (const ji of ALL) expect(ji.colloc.id).toBe(ji.item.collocationId)
  })

  test('filters by level, role, and preposition', () => {
    const b1 = filterWoQuestionItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(ji => ji.colloc.level === 'B1')).toBe(true)

    const adjectives = filterWoQuestionItems({ roles: ['adjective'] })
    expect(adjectives.length).toBeGreaterThan(0)
    expect(adjectives.every(ji => ji.colloc.role === 'adjective')).toBe(true)

    const auf = filterWoQuestionItems({ preps: ['auf'] })
    expect(auf.length).toBeGreaterThan(0)
    expect(auf.every(ji => ji.colloc.preposition === 'auf')).toBe(true)
  })

  test('a role with zero matches filters to empty (the dataset has no noun-role items)', () => {
    expect(filterWoQuestionItems({ roles: ['noun'] })).toEqual([])
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleWoQuestionItems(5, { levels: ['B1'] })
    expect(sample.length).toBe(5)
    expect(sample.every(ji => ji.colloc.level === 'B1')).toBe(true)
  })

  test('WO_QUESTION_PREPS is exactly the distinct prepositions the dataset governs', () => {
    const expected = Array.from(new Set(ALL.map(ji => ji.colloc.preposition))).sort()
    expect(WO_QUESTION_PREPS).toEqual(expected)
  })
})

describe('useDaWoQuestionQuiz — answer derivation', () => {
  test('every question answer matches woQuestionAnswer(item)', () => {
    const quiz = useDaWoQuestionQuiz(ALL)
    for (let i = 0; i < ALL.length; i++) {
      const q = quiz.current.value!
      expect(q.answer).toBe(woQuestionAnswer(q.item))
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
  })

  test('thing derivation: warten-auf -> "Worauf"', () => {
    const ji = ALL.find(j => j.item.id === 'wq-warten-auf')!
    expect(ji).toBeTruthy()
    const quiz = useDaWoQuestionQuiz([ji])
    expect(quiz.current.value!.answer).toBe('Worauf')
  })

  test('person accusative: stolz-auf -> "Auf wen"', () => {
    const ji = ALL.find(j => j.item.id === 'wq-stolz-auf')!
    expect(ji).toBeTruthy()
    expect(ji.colloc.case).toBe('accusative')
    const quiz = useDaWoQuestionQuiz([ji])
    expect(quiz.current.value!.answer).toBe('Auf wen')
  })

  test('person dative: sich-treffen-mit -> "Mit wem"', () => {
    const ji = ALL.find(j => j.item.id === 'wq-sich-treffen-mit')!
    expect(ji).toBeTruthy()
    expect(ji.colloc.case).toBe('dative')
    const quiz = useDaWoQuestionQuiz([ji])
    expect(quiz.current.value!.answer).toBe('Mit wem')
  })
})

describe('useDaWoQuestionQuiz — grading (type-only)', () => {
  test('accepts a folded-umlaut answer (worueber for Worüber)', () => {
    const ji = ALL.find(j => j.item.id === 'wq-sich-aergern-ueber')!
    expect(ji).toBeTruthy()
    expect(woQuestionAnswer(ji.item)).toBe('Worüber')
    const quiz = useDaWoQuestionQuiz([ji])
    quiz.submitText('worueber')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('grading is case-insensitive (WORAUF matches Worauf)', () => {
    const ji = ALL.find(j => j.item.id === 'wq-warten-auf')!
    const quiz = useDaWoQuestionQuiz([ji])
    quiz.submitText('WORAUF')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('accepts an alsoAccept alternative (thing kind, synthetic item on sich-schaemen-fuer)', () => {
    const colloc = byId.get('sich-schaemen-fuer')!
    expect((colloc.alsoAccept ?? []).some(a => a.preposition === 'über')).toBe(true)
    const item: WoQuestionItem = {
      id: 'test-wq-alt', collocationId: 'sich-schaemen-fuer', level: colloc.level,
      objectKind: 'thing', statement: 'Er schämt sich für sein Verhalten.',
      scaffold: '___ schämt er sich?',
    }
    const ji: WoJoinedItem = { item, colloc }
    expect(woQuestionAnswer(item)).toBe('Wofür')
    const quiz = useDaWoQuestionQuiz([ji])
    quiz.submitText('worüber')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('rejects a wrong answer and lands it in wrongItems once finished', () => {
    const ji = ALL[0]
    const quiz = useDaWoQuestionQuiz([ji])
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
    const quiz = useDaWoQuestionQuiz([ji])
    quiz.submitText('completely-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.submitText(woQuestionAnswer(ji.item))
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('empty/whitespace-only input never grades correct', () => {
    const ji = ALL[0]
    const quiz = useDaWoQuestionQuiz([ji])
    quiz.submitText('   ')
    expect(quiz.current.value!.isCorrect).toBe(false)
  })
})

describe('splitWoScaffold', () => {
  test('splits off the leading gap, leaving the rest of the question', () => {
    const item = DA_WO_QUESTION.find(i => i.id === 'wq-warten-auf')!
    expect(splitWoScaffold(item)).toEqual({ post: 'wartest du?' })
  })

  test('every item in the dataset splits cleanly: "___ " + post reconstructs the scaffold', () => {
    for (const item of DA_WO_QUESTION) {
      const { post } = splitWoScaffold(item)
      expect(`___ ${post}`).toBe(item.scaffold)
    }
  })
})

// Type-only sanity check: WoJoinedItem shape used across the module.
const _typeCheck: WoJoinedItem = ALL[0]
void _typeCheck
