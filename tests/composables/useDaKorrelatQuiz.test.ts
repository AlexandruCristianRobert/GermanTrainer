import { describe, test, expect } from 'vitest'
import {
  useDaKorrelatQuiz, filterKorrelatItems, sampleKorrelatItems, splitKorrelatSentence,
  korrelatAccepts, korrelatCorrectLabel, KEIN_KORRELAT, KORRELAT_KINDS,
} from '../../src/composables/useDaKorrelatQuiz'
import { DA_KORRELAT, type KorrelatItem } from '../../src/data/daKorrelat'

const byStatus = (s: KorrelatItem['korrelat']) => DA_KORRELAT.filter(i => i.korrelat === s)

describe('filterKorrelatItems / sampleKorrelatItems', () => {
  test('filters by level', () => {
    const b1 = filterKorrelatItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(i => i.level === 'B1')).toBe(true)
  })

  test('filters by kind', () => {
    const excluded = filterKorrelatItems({ kinds: ['excluded'] })
    expect(excluded.length).toBeGreaterThan(0)
    expect(excluded.every(i => i.korrelat === 'excluded')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterKorrelatItems({}).length).toBe(DA_KORRELAT.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleKorrelatItems(5, { kinds: ['optional'] })
    expect(sample.length).toBe(5)
    expect(sample.every(i => i.korrelat === 'optional')).toBe(true)
  })
})

describe('KORRELAT_KINDS', () => {
  test('lists all three statuses exactly once', () => {
    expect([...KORRELAT_KINDS].sort()).toEqual(['excluded', 'obligatory', 'optional'])
  })
})

describe('useDaKorrelatQuiz — option composition', () => {
  test('obligatory items: 4 options, the answer exactly once, KEIN_KORRELAT exactly once, all distinct', () => {
    const pool = byStatus('obligatory')
    const quiz = useDaKorrelatQuiz(pool)
    for (let i = 0; i < pool.length; i++) {
      const q = quiz.current.value!
      expect(q.answer).not.toBeNull()
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options.filter(o => o === q.answer).length).toBe(1)
      expect(q.options.filter(o => o === KEIN_KORRELAT).length).toBe(1)
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
  })

  test('optional items: same 4-option shape as obligatory', () => {
    const pool = byStatus('optional')
    const quiz = useDaKorrelatQuiz(pool)
    for (let i = 0; i < pool.length; i++) {
      const q = quiz.current.value!
      expect(q.answer).not.toBeNull()
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options).toContain(q.answer)
      expect(q.options).toContain(KEIN_KORRELAT)
      quiz.advance()
    }
  })

  test('excluded items: answer is null; KEIN_KORRELAT plus 3 distinct compound distractors', () => {
    const pool = byStatus('excluded')
    const quiz = useDaKorrelatQuiz(pool)
    for (let i = 0; i < pool.length; i++) {
      const q = quiz.current.value!
      expect(q.answer).toBeNull()
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options).toContain(KEIN_KORRELAT)
      expect(q.options.filter(o => o !== KEIN_KORRELAT)).toHaveLength(3)
      quiz.advance()
    }
  })

  test('obligatory/optional distractors never equal the item\'s own answer', () => {
    for (const item of [...byStatus('obligatory'), ...byStatus('optional')]) {
      const quiz = useDaKorrelatQuiz([item])
      const q = quiz.current.value!
      const distractors = q.options.filter(o => o !== q.answer && o !== KEIN_KORRELAT)
      expect(distractors).toHaveLength(2)
      expect(distractors).not.toContain(q.answer)
    }
  })
})

describe('korrelatAccepts — per-status grading rule', () => {
  test('obligatory: only the compound is accepted', () => {
    expect(korrelatAccepts('obligatory', 'darauf', 'darauf')).toBe(true)
    expect(korrelatAccepts('obligatory', 'darauf', KEIN_KORRELAT)).toBe(false)
    expect(korrelatAccepts('obligatory', 'darauf', 'daran')).toBe(false)
  })

  test('excluded: only KEIN_KORRELAT is accepted', () => {
    expect(korrelatAccepts('excluded', null, KEIN_KORRELAT)).toBe(true)
    expect(korrelatAccepts('excluded', null, 'darauf')).toBe(false)
  })

  test('optional: BOTH the compound and KEIN_KORRELAT are accepted', () => {
    expect(korrelatAccepts('optional', 'darüber', 'darüber')).toBe(true)
    expect(korrelatAccepts('optional', 'darüber', KEIN_KORRELAT)).toBe(true)
    expect(korrelatAccepts('optional', 'darüber', 'daran')).toBe(false)
  })
})

describe('korrelatCorrectLabel', () => {
  test('obligatory -> the compound; excluded -> KEIN_KORRELAT; optional -> both, joined', () => {
    expect(korrelatCorrectLabel('obligatory', 'darauf')).toBe('darauf')
    expect(korrelatCorrectLabel('excluded', null)).toBe(KEIN_KORRELAT)
    expect(korrelatCorrectLabel('optional', 'darüber')).toContain('darüber')
    expect(korrelatCorrectLabel('optional', 'darüber')).toContain(KEIN_KORRELAT)
  })
})

describe('useDaKorrelatQuiz — pickOption bookkeeping', () => {
  test('pickOption grades, locks the question, and is a no-op once answered', () => {
    const item = byStatus('obligatory')[0]
    const quiz = useDaKorrelatQuiz([item])
    const q = quiz.current.value!
    const wrongOption = q.options.find(o => !korrelatAccepts(item.korrelat, q.answer, o))!
    quiz.pickOption(wrongOption)
    expect(quiz.current.value!.isCorrect).toBe(false)
    quiz.pickOption(q.answer!) // second pick on an already-answered question is a no-op
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('optional item accepts KEIN_KORRELAT as a correct pick even though a compound answer exists', () => {
    const item = byStatus('optional')[0]
    const quiz = useDaKorrelatQuiz([item])
    quiz.pickOption(KEIN_KORRELAT)
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('optional item accepts the compound itself as a correct pick', () => {
    const item = byStatus('optional')[0]
    const quiz = useDaKorrelatQuiz([item])
    const q = quiz.current.value!
    quiz.pickOption(q.answer!)
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('excluded item rejects any compound pick', () => {
    const item = byStatus('excluded')[0]
    const quiz = useDaKorrelatQuiz([item])
    const q = quiz.current.value!
    const compoundOption = q.options.find(o => o !== KEIN_KORRELAT)!
    quiz.pickOption(compoundOption)
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('excluded item accepts KEIN_KORRELAT', () => {
    const item = byStatus('excluded')[0]
    const quiz = useDaKorrelatQuiz([item])
    quiz.pickOption(KEIN_KORRELAT)
    expect(quiz.current.value!.isCorrect).toBe(true)
  })

  test('score/wrongItems/finished bookkeeping over a small mixed run', () => {
    const items = [byStatus('obligatory')[0], byStatus('excluded')[0]]
    const quiz = useDaKorrelatQuiz(items)
    quiz.pickOption(quiz.current.value!.answer!) // correct
    quiz.advance()
    quiz.pickOption('totally-wrong-compound') // wrong (excluded wants KEIN_KORRELAT)
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([items[1]])
  })
})

describe('splitKorrelatSentence', () => {
  test('splits around the single gap', () => {
    expect(splitKorrelatSentence('Er ___, dass es regnet.')).toEqual({
      pre: 'Er ', post: ', dass es regnet.',
    })
  })

  test('falls back to the whole sentence (empty post) when there is no gap', () => {
    expect(splitKorrelatSentence('No gap here.')).toEqual({ pre: 'No gap here.', post: '' })
  })
})
