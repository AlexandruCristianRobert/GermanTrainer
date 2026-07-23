import { describe, test, expect } from 'vitest'
import {
  useDaDialogueQuiz, joinDialogueItems, filterDialogueItems, sampleDialogueItems,
  splitScaffold, DIALOGUE_PREPS, type DialogueJoinedItem,
} from '../../src/composables/useDaDialogueQuiz'
import { DA_DIALOGUE, dialogueAnswers, type DialogueItem } from '../../src/data/daDialogue'
import { COLLOCATIONS } from '../../src/data/collocations'

const ALL = joinDialogueItems()
const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

describe('joinDialogueItems / filterDialogueItems / sampleDialogueItems', () => {
  test('joins every dialogue item to its collocation', () => {
    expect(ALL.length).toBe(DA_DIALOGUE.length)
    for (const ji of ALL) expect(ji.colloc.id).toBe(ji.item.collocationId)
  })

  test('filters by level and preposition', () => {
    const b1 = filterDialogueItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(ji => ji.colloc.level === 'B1')).toBe(true)

    const auf = filterDialogueItems({ preps: ['auf'] })
    expect(auf.length).toBeGreaterThan(0)
    expect(auf.every(ji => ji.colloc.preposition === 'auf')).toBe(true)
  })

  test('every dialogue item joins a verb-role collocation, so a noun/adjective role filters to empty', () => {
    expect(ALL.every(ji => ji.colloc.role === 'verb')).toBe(true)
    expect(filterDialogueItems({ roles: ['noun'] })).toEqual([])
    expect(filterDialogueItems({ roles: ['adjective'] })).toEqual([])
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleDialogueItems(5, { levels: ['B1'] })
    expect(sample.length).toBe(5)
    expect(sample.every(ji => ji.colloc.level === 'B1')).toBe(true)
  })

  test('DIALOGUE_PREPS is exactly the distinct prepositions the dataset governs', () => {
    const expected = Array.from(new Set(ALL.map(ji => ji.colloc.preposition))).sort()
    expect(DIALOGUE_PREPS).toEqual(expected)
  })
})

describe('useDaDialogueQuiz — answer derivation', () => {
  test('every question answer matches dialogueAnswers(item)', () => {
    const quiz = useDaDialogueQuiz(ALL)
    for (let i = 0; i < ALL.length; i++) {
      const q = quiz.current.value!
      expect(q.answer).toEqual(dialogueAnswers(q.item))
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
  })

  test('spot check: warten-auf -> { wo: "Worauf", da: "darauf" }', () => {
    const ji = ALL.find(j => j.item.id === 'dl-warten-auf')!
    expect(ji).toBeTruthy()
    const quiz = useDaDialogueQuiz([ji])
    expect(quiz.current.value!.answer).toEqual({ wo: 'Worauf', da: 'darauf' })
  })

  test('spot check: sich-freuen-ueber -> { wo: "Worüber", da: "darüber" }', () => {
    const ji = ALL.find(j => j.item.id === 'dl-sich-freuen-ueber')!
    expect(ji).toBeTruthy()
    const quiz = useDaDialogueQuiz([ji])
    expect(quiz.current.value!.answer).toEqual({ wo: 'Worüber', da: 'darüber' })
  })
})

describe('useDaDialogueQuiz — grading (submitBoth, all-or-nothing)', () => {
  test('both slots correct -> card correct, both verdicts true', () => {
    const ji = ALL.find(j => j.item.id === 'dl-warten-auf')!
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('Worauf', 'darauf')
    expect(quiz.current.value!.woOk).toBe(true)
    expect(quiz.current.value!.daOk).toBe(true)
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('wo wrong, da right -> card wrong, per-slot verdicts differ', () => {
    const ji = ALL.find(j => j.item.id === 'dl-warten-auf')!
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('Worüber', 'darauf')
    expect(quiz.current.value!.woOk).toBe(false)
    expect(quiz.current.value!.daOk).toBe(true)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('wo right, da wrong -> card wrong, per-slot verdicts differ', () => {
    const ji = ALL.find(j => j.item.id === 'dl-warten-auf')!
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('Worauf', 'daran')
    expect(quiz.current.value!.woOk).toBe(true)
    expect(quiz.current.value!.daOk).toBe(false)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('both wrong -> card wrong, both verdicts false', () => {
    const ji = ALL.find(j => j.item.id === 'dl-warten-auf')!
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('nonsense', 'nonsense')
    expect(quiz.current.value!.woOk).toBe(false)
    expect(quiz.current.value!.daOk).toBe(false)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('accepts folded-umlaut input for both slots (worueber/darueber for Worüber/darüber)', () => {
    const ji = ALL.find(j => j.item.id === 'dl-sich-freuen-ueber')!
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('worueber', 'darueber')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('grading is case-insensitive', () => {
    const ji = ALL.find(j => j.item.id === 'dl-warten-auf')!
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('WORAUF', 'DARAUF')
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('accepts an alsoAccept alternative on both slots (synthetic item on sich-schaemen-fuer)', () => {
    const colloc = byId.get('sich-schaemen-fuer')!
    expect((colloc.alsoAccept ?? []).some(a => a.preposition === 'über')).toBe(true)
    const item: DialogueItem = {
      id: 'test-dl-alt', collocationId: 'sich-schaemen-fuer', level: colloc.level,
      questionScaffold: '___ schämt er sich?',
      answerScaffold: 'Er schämt sich ___, dass er zu spät gekommen ist.',
    }
    const ji: DialogueJoinedItem = { item, colloc }
    expect(dialogueAnswers(item)).toEqual({ wo: 'Wofür', da: 'dafür' })
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('worüber', 'darüber')
    expect(quiz.current.value!.woOk).toBe(true)
    expect(quiz.current.value!.daOk).toBe(true)
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('rejects a wrong card and lands it in wrongItems once finished', () => {
    const ji = ALL[0]
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('completely-wrong', 'also-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
    expect(quiz.wrongItems.value[0].item.id).toBe(ji.item.id)
  })

  test('a correct card does not appear in wrongItems, and score counts it', () => {
    const ji = ALL.find(j => j.item.id === 'dl-warten-auf')!
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('Worauf', 'darauf')
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([])
  })

  test('a second submitBoth on an already-graded question is a no-op', () => {
    const ji = ALL.find(j => j.item.id === 'dl-warten-auf')!
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('completely-wrong', 'also-wrong')
    expect(quiz.current.value!.isCorrect).toBe(false)
    const { wo, da } = dialogueAnswers(ji.item)
    quiz.submitBoth(wo, da)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('empty/whitespace-only input on either slot never grades that slot correct', () => {
    const ji = ALL.find(j => j.item.id === 'dl-warten-auf')!
    const quiz = useDaDialogueQuiz([ji])
    quiz.submitBoth('   ', 'darauf')
    expect(quiz.current.value!.woOk).toBe(false)
    expect(quiz.current.value!.daOk).toBe(true)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })
})

describe('splitScaffold', () => {
  test('splits off the leading gap of a questionScaffold, leaving the rest', () => {
    const item = DA_DIALOGUE.find(i => i.id === 'dl-warten-auf')!
    expect(splitScaffold(item.questionScaffold)).toEqual({ pre: '', post: ' wartest du denn schon so lange?' })
  })

  test('splits a mid-sentence gap of an answerScaffold, leaving pre and post', () => {
    const item = DA_DIALOGUE.find(i => i.id === 'dl-warten-auf')!
    expect(splitScaffold(item.answerScaffold)).toEqual({
      pre: 'Ich warte ',
      post: ', dass endlich die Ferien beginnen.',
    })
  })

  test('every scaffold in the dataset splits cleanly: pre + "___" + post reconstructs the original', () => {
    for (const item of DA_DIALOGUE) {
      const q = splitScaffold(item.questionScaffold)
      expect(`${q.pre}___${q.post}`).toBe(item.questionScaffold)
      const a = splitScaffold(item.answerScaffold)
      expect(`${a.pre}___${a.post}`).toBe(item.answerScaffold)
    }
  })
})

// Type-only sanity check: DialogueJoinedItem shape used across the module.
const _typeCheck: DialogueJoinedItem = ALL[0]
void _typeCheck
