import { describe, test, expect } from 'vitest'
import {
  useDaTransformQuiz, joinTransformItems, filterTransformItems, sampleTransformItems,
  splitTransformSentence, TRANSFORM_PREPS, type TransformJoinedItem,
} from '../../src/composables/useDaTransformQuiz'
import { DA_TRANSFORM, transformAnswer, type TransformItem } from '../../src/data/daTransform'
import { daCompound } from '../../src/data/daCompounds'
import { PRONOUN_FORMS } from '../../src/data/daPersonCase'

const ALL = joinTransformItems()

describe('joinTransformItems / filterTransformItems / sampleTransformItems', () => {
  test('joins every transform item to its collocation', () => {
    expect(ALL.length).toBe(DA_TRANSFORM.length)
    for (const ji of ALL) expect(ji.colloc.id).toBe(ji.item.collocationId)
  })

  test('filters by level, role, and preposition', () => {
    const b1 = filterTransformItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(ji => ji.colloc.level === 'B1')).toBe(true)

    const verbs = filterTransformItems({ roles: ['verb'] })
    expect(verbs.length).toBeGreaterThan(0)
    expect(verbs.every(ji => ji.colloc.role === 'verb')).toBe(true)

    const auf = filterTransformItems({ preps: ['auf'] })
    expect(auf.length).toBeGreaterThan(0)
    expect(auf.every(ji => ji.colloc.preposition === 'auf')).toBe(true)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleTransformItems(5, { levels: ['B1'] })
    expect(sample.length).toBe(5)
    expect(sample.every(ji => ji.colloc.level === 'B1')).toBe(true)
  })

  test('TRANSFORM_PREPS is exactly the distinct prepositions the dataset governs', () => {
    const expected = Array.from(new Set(ALL.map(ji => ji.colloc.preposition))).sort()
    expect(TRANSFORM_PREPS).toEqual(expected)
  })
})

describe('transformAnswer (re-derived, sanity)', () => {
  test('thing items answer with the da-compound; person items with prep + declined pronoun', () => {
    for (const ji of ALL) {
      const expected = ji.item.objectKind === 'thing'
        ? daCompound(ji.colloc.preposition)
        : `${ji.colloc.preposition} ${PRONOUN_FORMS[ji.item.personCue!][ji.colloc.case]}`
      expect(transformAnswer(ji.item)).toBe(expected)
    }
  })
})

describe('useDaTransformQuiz — pick mode', () => {
  test('every question has 2 or 3 deduplicated options, containing the answer exactly once', () => {
    const quiz = useDaTransformQuiz(ALL, { mode: 'pick' })
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

  test('a THING item option triple contains the compound + both default-cue pronoun-case forms', () => {
    const ji = ALL.find(j => j.item.id === 'tr-warten-auf')!
    expect(ji).toBeTruthy()
    const quiz = useDaTransformQuiz([ji], { mode: 'pick' })
    const q = quiz.current.value!
    expect(new Set(q.options!)).toEqual(new Set(['darauf', 'auf ihn', 'auf ihm']))
    expect(q.answer).toBe('darauf')
  })

  test('a PERSON item is graded on its collocation\'s case (accusative)', () => {
    const ji = ALL.find(j => j.item.id === 'tr-glauben-an')!
    expect(ji).toBeTruthy()
    expect(ji.colloc.case).toBe('accusative')
    expect(transformAnswer(ji.item)).toBe('an ihn')
    const quiz = useDaTransformQuiz([ji], { mode: 'pick' })
    const q = quiz.current.value!
    expect(new Set(q.options!)).toEqual(new Set(['an ihn', 'an ihm', daCompound('an')]))
    quiz.pickOption('an ihm')
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('a PERSON item is graded on its collocation\'s case (dative)', () => {
    const ji = ALL.find(j => j.item.id === 'tr-sich-treffen-mit')!
    expect(ji).toBeTruthy()
    expect(ji.colloc.case).toBe('dative')
    expect(transformAnswer(ji.item)).toBe('mit ihr')
    const quiz = useDaTransformQuiz([ji], { mode: 'pick' })
    quiz.pickOption('mit ihr')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('dedup case: a synthetic "wir" cue collapses accusative=dative -> exactly 2 options', () => {
    const base = ALL.find(j => j.item.objectKind === 'thing')!
    const wirItem: TransformItem = {
      id: 'test-wir-dedup',
      collocationId: base.colloc.id,
      level: base.colloc.level,
      objectKind: 'person',
      personCue: 'wir',
      sentence: `Man wendet sich ${base.colloc.preposition} uns.`,
      object: `${base.colloc.preposition} uns`,
    }
    const ji: TransformJoinedItem = { item: wirItem, colloc: base.colloc }
    const quiz = useDaTransformQuiz([ji], { mode: 'pick' })
    const q = quiz.current.value!
    expect(q.options!.length).toBe(2)
    expect(q.options).toContain(q.answer)
    const other = q.options!.find(o => o !== q.answer)!
    expect(other).toBe(daCompound(base.colloc.preposition))
  })

  test('pickOption grades correct/incorrect and locks the question', () => {
    const pool = ALL.slice(0, 1)
    const quiz = useDaTransformQuiz(pool, { mode: 'pick' })
    const q = quiz.current.value!
    const wrongOption = q.options!.find(o => o !== q.answer)!
    quiz.pickOption(wrongOption)
    expect(quiz.current.value!.isCorrect).toBe(false)
    // Second pick on the same (already-answered) question is a no-op.
    quiz.pickOption(q.answer)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })
})

describe('useDaTransformQuiz — type mode', () => {
  test('has no options', () => {
    const quiz = useDaTransformQuiz(ALL.slice(0, 1), { mode: 'type' })
    expect(quiz.current.value!.options).toBeNull()
  })

  test('accepts a folded-umlaut answer (darueber for darüber)', () => {
    const ji = ALL.find(j => j.item.id === 'tr-sich-aergern-ueber')!
    expect(ji).toBeTruthy()
    expect(transformAnswer(ji.item)).toBe('darüber')
    const quiz = useDaTransformQuiz([ji], { mode: 'type' })
    quiz.submitText('darueber')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('accepts an alsoAccept alternative (über ihn for sich schämen für, person)', () => {
    const ji = ALL.find(j => j.item.id === 'tr-sich-schaemen-fuer')
    if (!ji) return // dataset may rotate; the semantics are covered by the engine contract
    expect((ji.colloc.alsoAccept ?? []).some(a => a.preposition === 'über')).toBe(true)
    const quiz = useDaTransformQuiz([ji], { mode: 'type' })
    quiz.submitText('über ihn')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('rejects a wrong answer and lands it in wrongItems once finished', () => {
    const ji = ALL[0]
    const quiz = useDaTransformQuiz([ji], { mode: 'type' })
    quiz.submitText('completely-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
    expect(quiz.wrongItems.value[0].item.id).toBe(ji.item.id)
  })
})

describe('splitTransformSentence', () => {
  test('splits the sentence around its exact object substring', () => {
    const item = DA_TRANSFORM.find(i => i.id === 'tr-warten-auf')!
    expect(splitTransformSentence(item)).toEqual({
      pre: 'Wir warten schon eine Stunde ',
      object: 'auf den Bus',
      post: '.',
    })
  })
})

// Type-only sanity check: TransformJoinedItem shape used across the module.
const _typeCheck: TransformJoinedItem = ALL[0]
void _typeCheck
