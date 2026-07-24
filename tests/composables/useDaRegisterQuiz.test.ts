import { describe, test, expect } from 'vitest'
import {
  useDaRegisterQuiz, filterRegisterItems, sampleRegisterItems, correctedForm, REGISTER_OPTIONS,
} from '../../src/composables/useDaRegisterQuiz'
import { DA_REGISTER, type RegisterItem } from '../../src/data/daRegister'

describe('filterRegisterItems / sampleRegisterItems', () => {
  test('filters by level', () => {
    const b2 = filterRegisterItems({ levels: ['B2'] })
    expect(b2.length).toBeGreaterThan(0)
    expect(b2.every(i => i.level === 'B2')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterRegisterItems({}).length).toBe(DA_REGISTER.length)
    expect(filterRegisterItems().length).toBe(DA_REGISTER.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleRegisterItems(5, { levels: ['B2'] })
    expect(sample.length).toBe(5)
    expect(sample.every(i => i.level === 'B2')).toBe(true)
  })
})

describe('REGISTER_OPTIONS — three FIXED options, stable order', () => {
  test('standard / spoken / wrong, in that order, with the exact labels', () => {
    expect(REGISTER_OPTIONS.map(o => o.verdict)).toEqual(['standard', 'spoken', 'wrong'])
    expect(REGISTER_OPTIONS.map(o => o.label)).toEqual([
      'Standard – auch geschrieben', 'Nur gesprochen', 'Immer falsch',
    ])
  })
})

describe('useDaRegisterQuiz — option composition', () => {
  test('every question exposes exactly the three fixed options, in that fixed order', () => {
    for (const item of DA_REGISTER) {
      const quiz = useDaRegisterQuiz([item])
      expect(quiz.current.value!.options).toEqual(REGISTER_OPTIONS)
    }
  })
})

describe('useDaRegisterQuiz — verdict grading', () => {
  test('grades a standard item correctly when "standard" is picked', () => {
    const item = DA_REGISTER.find(i => i.verdict === 'standard')!
    const quiz = useDaRegisterQuiz([item])
    quiz.pick('standard')
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe('standard')
  })

  test('grades a spoken item correctly when "spoken" is picked', () => {
    const item = DA_REGISTER.find(i => i.verdict === 'spoken')!
    const quiz = useDaRegisterQuiz([item])
    quiz.pick('spoken')
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe('spoken')
  })

  test('grades a wrong item correctly when "wrong" is picked', () => {
    const item = DA_REGISTER.find(i => i.verdict === 'wrong')!
    const quiz = useDaRegisterQuiz([item])
    quiz.pick('wrong')
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe('wrong')
  })

  test('any mismatched verdict grades false', () => {
    const standard = DA_REGISTER.find(i => i.verdict === 'standard')!
    const spoken = DA_REGISTER.find(i => i.verdict === 'spoken')!
    const wrong = DA_REGISTER.find(i => i.verdict === 'wrong')!

    const q1 = useDaRegisterQuiz([standard])
    q1.pick('spoken')
    expect(q1.current.value!.isCorrect).toBe(false)

    const q2 = useDaRegisterQuiz([spoken])
    q2.pick('wrong')
    expect(q2.current.value!.isCorrect).toBe(false)

    const q3 = useDaRegisterQuiz([wrong])
    q3.pick('standard')
    expect(q3.current.value!.isCorrect).toBe(false)
  })

  test('second pick on an already-answered question is a no-op', () => {
    const item = DA_REGISTER.find(i => i.verdict === 'standard')!
    const quiz = useDaRegisterQuiz([item])
    quiz.pick('standard')
    quiz.pick('wrong')
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.picked).toBe('standard')
  })

  test('score/wrongItems/finished bookkeeping over a small mixed run', () => {
    const items: RegisterItem[] = [
      DA_REGISTER.find(i => i.verdict === 'standard')!,
      DA_REGISTER.find(i => i.verdict === 'spoken')!,
    ]
    const quiz = useDaRegisterQuiz(items)
    quiz.pick('standard') // correct
    quiz.advance()
    quiz.pick('wrong') // wrong — item is actually 'spoken'
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([items[1]])
  })

  test('total reflects the number of items', () => {
    const items = DA_REGISTER.slice(0, 3)
    const quiz = useDaRegisterQuiz(items)
    expect(quiz.total.value).toBe(3)
  })
})

describe('correctedForm', () => {
  test('returns null for standard/spoken items (no correction to show)', () => {
    const standard = DA_REGISTER.find(i => i.verdict === 'standard')!
    const spoken = DA_REGISTER.find(i => i.verdict === 'spoken')!
    expect(correctedForm(standard)).toBeNull()
    expect(correctedForm(spoken)).toBeNull()
  })

  test('extracts the corrected form named in a wrong item\'s explanation (spot check)', () => {
    const item = DA_REGISTER.find(i => i.id === 'rg-25')!
    expect(correctedForm(item)).toBe('darauf')
  })

  test('every wrong item yields a non-empty corrected form', () => {
    for (const item of DA_REGISTER.filter(i => i.verdict === 'wrong')) {
      expect(correctedForm(item), item.id).toBeTruthy()
    }
  })
})
