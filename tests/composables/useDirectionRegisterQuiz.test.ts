import { describe, test, expect } from 'vitest'
import {
  useDwRegisterQuiz, filterDwRegisterItems, sampleDwRegisterItems, dwCorrectedForm, DW_REGISTER_OPTIONS,
} from '../../src/composables/useDirectionRegisterQuiz'
import { DIRECTION_REGISTER, type DwRegisterItem } from '../../src/data/directionRegister'

describe('filterDwRegisterItems / sampleDwRegisterItems', () => {
  test('filters by level', () => {
    const b2 = filterDwRegisterItems({ levels: ['B2'] })
    expect(b2.length).toBeGreaterThan(0)
    expect(b2.every(i => i.level === 'B2')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterDwRegisterItems({}).length).toBe(DIRECTION_REGISTER.length)
    expect(filterDwRegisterItems().length).toBe(DIRECTION_REGISTER.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleDwRegisterItems(5, { levels: ['B2'] })
    expect(sample.length).toBe(5)
    expect(sample.every(i => i.level === 'B2')).toBe(true)
  })
})

describe('filterDwRegisterItems — pair semantics (custom filter, NOT bare createPool)', () => {
  test('null-pair items match any non-empty pairs selection', () => {
    const nullPairItems = DIRECTION_REGISTER.filter(i => i.pair === null)
    expect(nullPairItems.length).toBeGreaterThan(0)
    const result = filterDwRegisterItems({ pairs: ['ein'] })
    for (const item of nullPairItems) expect(result).toContain(item)
  })

  test('pair-tagged items are filtered by the selected pairs', () => {
    const result = filterDwRegisterItems({ pairs: ['ein'] })
    expect(result.some(i => i.pair === 'ein')).toBe(true)
    expect(result.some(i => i.pair === 'aus')).toBe(false)
    expect(result.some(i => i.pair === 'auf')).toBe(false)
  })

  test('an empty pairs array excludes only pair-tagged items (keeps every null-pair item)', () => {
    const result = filterDwRegisterItems({ pairs: [] })
    const expectedNullPair = DIRECTION_REGISTER.filter(i => i.pair === null)
    expect(result.length).toBe(expectedNullPair.length)
    expect(result.every(i => i.pair === null)).toBe(true)
  })

  test('level filter still applies alongside the pair filter', () => {
    const result = filterDwRegisterItems({ levels: ['A2'], pairs: ['ein'] })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(i => i.level === 'A2')).toBe(true)
    expect(result.every(i => i.pair === null || i.pair === 'ein')).toBe(true)
  })
})

describe('DW_REGISTER_OPTIONS — three FIXED options, stable order', () => {
  test('standard / spoken / wrong, in that order, with the exact labels', () => {
    expect(DW_REGISTER_OPTIONS.map(o => o.verdict)).toEqual(['standard', 'spoken', 'wrong'])
    expect(DW_REGISTER_OPTIONS.map(o => o.label)).toEqual([
      'Standard – auch geschrieben', 'Nur gesprochen', 'Immer falsch',
    ])
  })
})

describe('useDwRegisterQuiz — option composition', () => {
  test('every question exposes exactly the three fixed options, in that fixed order', () => {
    for (const item of DIRECTION_REGISTER) {
      const quiz = useDwRegisterQuiz([item])
      expect(quiz.current.value!.options).toEqual(DW_REGISTER_OPTIONS)
    }
  })
})

describe('useDwRegisterQuiz — verdict grading', () => {
  test('grades a standard item correctly when "standard" is picked', () => {
    const item = DIRECTION_REGISTER.find(i => i.verdict === 'standard')!
    const quiz = useDwRegisterQuiz([item])
    quiz.pick('standard')
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe('standard')
  })

  test('grades a spoken item correctly when "spoken" is picked', () => {
    const item = DIRECTION_REGISTER.find(i => i.verdict === 'spoken')!
    const quiz = useDwRegisterQuiz([item])
    quiz.pick('spoken')
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe('spoken')
  })

  test('grades a wrong item correctly when "wrong" is picked', () => {
    const item = DIRECTION_REGISTER.find(i => i.verdict === 'wrong')!
    const quiz = useDwRegisterQuiz([item])
    quiz.pick('wrong')
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe('wrong')
  })

  test('any mismatched verdict grades false', () => {
    const standard = DIRECTION_REGISTER.find(i => i.verdict === 'standard')!
    const spoken = DIRECTION_REGISTER.find(i => i.verdict === 'spoken')!
    const wrong = DIRECTION_REGISTER.find(i => i.verdict === 'wrong')!

    const q1 = useDwRegisterQuiz([standard])
    q1.pick('spoken')
    expect(q1.current.value!.isCorrect).toBe(false)

    const q2 = useDwRegisterQuiz([spoken])
    q2.pick('wrong')
    expect(q2.current.value!.isCorrect).toBe(false)

    const q3 = useDwRegisterQuiz([wrong])
    q3.pick('standard')
    expect(q3.current.value!.isCorrect).toBe(false)
  })

  test('second pick on an already-answered question is a no-op', () => {
    const item = DIRECTION_REGISTER.find(i => i.verdict === 'standard')!
    const quiz = useDwRegisterQuiz([item])
    quiz.pick('standard')
    quiz.pick('wrong')
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe('standard')
  })

  test('score/wrongItems/finished bookkeeping over a small mixed run', () => {
    const items: DwRegisterItem[] = [
      DIRECTION_REGISTER.find(i => i.verdict === 'standard')!,
      DIRECTION_REGISTER.find(i => i.verdict === 'spoken')!,
    ]
    const quiz = useDwRegisterQuiz(items)
    quiz.pick('standard') // correct
    quiz.advance()
    quiz.pick('wrong') // wrong — item is actually 'spoken'
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([items[1]])
  })

  test('total reflects the number of items', () => {
    const items = DIRECTION_REGISTER.slice(0, 3)
    const quiz = useDwRegisterQuiz(items)
    expect(quiz.total.value).toBe(3)
  })
})

describe('dwCorrectedForm', () => {
  test('returns null for standard/spoken items (no correction to show)', () => {
    const standard = DIRECTION_REGISTER.find(i => i.verdict === 'standard')!
    const spoken = DIRECTION_REGISTER.find(i => i.verdict === 'spoken')!
    expect(dwCorrectedForm(standard)).toBeNull()
    expect(dwCorrectedForm(spoken)).toBeNull()
  })

  test('extracts the LAST quoted string of the English half for a wrong item (spot check)', () => {
    const item = DIRECTION_REGISTER.find(i => i.id === 'dwr-27')!
    expect(dwCorrectedForm(item)).toBe('hinein')
  })

  test('every wrong item yields a non-empty corrected form', () => {
    for (const item of DIRECTION_REGISTER.filter(i => i.verdict === 'wrong')) {
      expect(dwCorrectedForm(item), item.id).toBeTruthy()
    }
  })
})
