import { describe, test, expect } from 'vitest'
import {
  useDaParaphraseQuiz, joinParaphraseItems, filterParaphraseItems, sampleParaphraseItems,
  splitParaphraseSentence, PARAPHRASE_PREPS, type ParaphraseJoinedItem,
} from '../../src/composables/useDaParaphraseQuiz'
import { DA_PARAPHRASE, paraphraseAnswers, type ParaphraseItem } from '../../src/data/daParaphrase'
import { COLLOCATIONS } from '../../src/data/collocations'

const ALL = joinParaphraseItems()
const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

describe('joinParaphraseItems / filterParaphraseItems / sampleParaphraseItems', () => {
  test('joins every paraphrase item to its collocation', () => {
    expect(ALL.length).toBe(DA_PARAPHRASE.length)
    for (const ji of ALL) expect(ji.colloc.id).toBe(ji.item.collocationId)
  })

  test('filters by level and preposition', () => {
    const b1 = filterParaphraseItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(ji => ji.colloc.level === 'B1')).toBe(true)

    const auf = filterParaphraseItems({ preps: ['auf'] })
    expect(auf.length).toBeGreaterThan(0)
    expect(auf.every(ji => ji.colloc.preposition === 'auf')).toBe(true)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleParaphraseItems(5, { levels: ['B1'] })
    expect(sample.length).toBe(5)
    expect(sample.every(ji => ji.colloc.level === 'B1')).toBe(true)
  })

  test('PARAPHRASE_PREPS is exactly the distinct prepositions the dataset governs', () => {
    const expected = Array.from(new Set(ALL.map(ji => ji.colloc.preposition))).sort()
    expect(PARAPHRASE_PREPS).toEqual(expected)
  })
})

describe('useDaParaphraseQuiz — answer derivation', () => {
  test('every question answer matches paraphraseAnswers(item)', () => {
    const quiz = useDaParaphraseQuiz(ALL)
    for (let i = 0; i < ALL.length; i++) {
      const q = quiz.current.value!
      expect(q.answer).toEqual(paraphraseAnswers(q.item))
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
  })

  test('spot check: sich-kuemmern-um -> { prep: "um", korrelat: "darum" }', () => {
    const ji = ALL.find(j => j.item.collocationId === 'sich-kuemmern-um')!
    expect(ji).toBeTruthy()
    const quiz = useDaParaphraseQuiz([ji])
    expect(quiz.current.value!.answer).toEqual({ prep: 'um', korrelat: 'darum' })
  })

  test('spot check: sich-freuen-ueber -> { prep: "über", korrelat: "darüber" }', () => {
    const ji = ALL.find(j => j.item.collocationId === 'sich-freuen-ueber')!
    expect(ji).toBeTruthy()
    const quiz = useDaParaphraseQuiz([ji])
    expect(quiz.current.value!.answer).toEqual({ prep: 'über', korrelat: 'darüber' })
  })
})

describe('useDaParaphraseQuiz — grading (submitBoth, all-or-nothing)', () => {
  test('both slots correct -> card correct, both verdicts true', () => {
    const ji = ALL.find(j => j.item.collocationId === 'warten-auf')!
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('auf', 'darauf')
    expect(quiz.current.value!.prepOk).toBe(true)
    expect(quiz.current.value!.korrelatOk).toBe(true)
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('prep wrong, korrelat right -> card wrong, per-slot verdicts differ', () => {
    const ji = ALL.find(j => j.item.collocationId === 'warten-auf')!
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('über', 'darauf')
    expect(quiz.current.value!.prepOk).toBe(false)
    expect(quiz.current.value!.korrelatOk).toBe(true)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('prep right, korrelat wrong -> card wrong, per-slot verdicts differ', () => {
    const ji = ALL.find(j => j.item.collocationId === 'warten-auf')!
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('auf', 'daran')
    expect(quiz.current.value!.prepOk).toBe(true)
    expect(quiz.current.value!.korrelatOk).toBe(false)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('both wrong -> card wrong, both verdicts false', () => {
    const ji = ALL.find(j => j.item.collocationId === 'warten-auf')!
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('nonsense', 'nonsense')
    expect(quiz.current.value!.prepOk).toBe(false)
    expect(quiz.current.value!.korrelatOk).toBe(false)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('accepts folded-umlaut input for the korrelat slot (darueber for darüber)', () => {
    const ji = ALL.find(j => j.item.collocationId === 'sich-freuen-ueber')!
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('ueber', 'darueber')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('grading is case-insensitive', () => {
    const ji = ALL.find(j => j.item.collocationId === 'warten-auf')!
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('AUF', 'DARAUF')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('accepts an alsoAccept alternative on both slots (synthetic item on sich-schaemen-fuer)', () => {
    const colloc = byId.get('sich-schaemen-fuer')!
    expect((colloc.alsoAccept ?? []).some(a => a.preposition === 'über')).toBe(true)
    const item: ParaphraseItem = {
      id: 'test-pp-alt', collocationId: 'sich-schaemen-fuer', level: colloc.level,
      nounSentence: 'Er schämt sich ___ sein schlechtes Verhalten.',
      clauseSentence: 'Er schämt sich ___, dass er sich schlecht verhalten hat.',
    }
    const ji: ParaphraseJoinedItem = { item, colloc }
    expect(paraphraseAnswers(item)).toEqual({ prep: 'für', korrelat: 'dafür' })
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('über', 'darüber')
    expect(quiz.current.value!.prepOk).toBe(true)
    expect(quiz.current.value!.korrelatOk).toBe(true)
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('rejects a wrong card and lands it in wrongItems once finished', () => {
    const ji = ALL[0]
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('completely-wrong', 'also-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
    expect(quiz.wrongItems.value[0].item.id).toBe(ji.item.id)
  })

  test('a correct card does not appear in wrongItems, and score counts it', () => {
    const ji = ALL.find(j => j.item.collocationId === 'warten-auf')!
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('auf', 'darauf')
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([])
  })

  test('a second submitBoth on an already-graded question is a no-op', () => {
    const ji = ALL.find(j => j.item.collocationId === 'warten-auf')!
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('completely-wrong', 'also-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    const { prep, korrelat } = paraphraseAnswers(ji.item)
    quiz.submitBoth(prep, korrelat)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('empty/whitespace-only input on either slot never grades that slot correct', () => {
    const ji = ALL.find(j => j.item.collocationId === 'warten-auf')!
    const quiz = useDaParaphraseQuiz([ji])
    quiz.submitBoth('   ', 'darauf')
    expect(quiz.current.value!.prepOk).toBe(false)
    expect(quiz.current.value!.korrelatOk).toBe(true)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })
})

describe('splitParaphraseSentence', () => {
  test('splits a mid-sentence gap of a nounSentence, leaving pre and post', () => {
    const item = DA_PARAPHRASE.find(i => i.collocationId === 'warten-auf')!
    expect(splitParaphraseSentence(item.nounSentence)).toEqual({
      pre: 'Wir warten ',
      post: ' den Beginn der Sommerferien.',
    })
  })

  test('splits a mid-sentence gap of a clauseSentence, leaving pre and post', () => {
    const item = DA_PARAPHRASE.find(i => i.collocationId === 'warten-auf')!
    expect(splitParaphraseSentence(item.clauseSentence)).toEqual({
      pre: 'Wir warten ',
      post: ', dass die Sommerferien endlich beginnen.',
    })
  })

  test('every scaffold in the dataset splits cleanly: pre + "___" + post reconstructs the original', () => {
    for (const item of DA_PARAPHRASE) {
      const n = splitParaphraseSentence(item.nounSentence)
      expect(`${n.pre}___${n.post}`).toBe(item.nounSentence)
      const c = splitParaphraseSentence(item.clauseSentence)
      expect(`${c.pre}___${c.post}`).toBe(item.clauseSentence)
    }
  })
})

// Type-only sanity check: ParaphraseJoinedItem shape used across the module.
const _typeCheck: ParaphraseJoinedItem = ALL[0]
void _typeCheck
