import { describe, test, expect } from 'vitest'
import {
  buildHinHerQuestions, buildCompoundQuestions, buildQuestionWordQuestions, useDirectionDrill,
} from '../../src/composables/useDirectionDrill'
import { HIN_HER_ITEMS, COMPOUND_ITEMS, QUESTION_ITEMS } from '../../src/data/directionItems'
import { hinForm, herForm } from '../../src/data/directionWords'

describe('builders', () => {
  test('T1: hin/her buttons, hier added only on trap items', () => {
    const qs = buildHinHerQuestions(HIN_HER_ITEMS)
    for (const [i, q] of qs.entries()) {
      const item = HIN_HER_ITEMS[q.sourceIndex]
      expect(q.sourceIndex).toBe(i)
      expect(q.options).toEqual(item.hierTrap ? ['hin', 'her', 'hier'] : ['hin', 'her'])
      expect(q.scene).not.toBeNull()
    }
  })

  test('T2: four unique real options, answer + side-swap always present', () => {
    const rng = () => 0.42
    const qs = buildCompoundQuestions(COMPOUND_ITEMS, rng)
    for (const q of qs) {
      const item = COMPOUND_ITEMS[q.sourceIndex]
      const sideSwap = q.answers[0] === hinForm(item.pair!) ? herForm(item.pair!) : hinForm(item.pair!)
      expect(q.options.length).toBe(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options).toContain(q.answers[0])
      expect(q.options).toContain(sideSwap)
      for (const o of q.options) expect(o).toMatch(/^(hin|her)(ein|aus|auf|unter|über|ab)$/)
    }
  })

  test('T3: stored options pass through; note becomes revealNote', () => {
    const qs = buildQuestionWordQuestions(QUESTION_ITEMS)
    for (const q of qs) {
      const item = QUESTION_ITEMS[q.sourceIndex]
      expect(q.options).toEqual(item.options)
      expect(q.scene).toBeNull()
      expect(q.revealNote).toBe(item.note ?? null)
    }
  })
})

describe('useDirectionDrill', () => {
  test('pick grading, score, finish', () => {
    const qs = buildHinHerQuestions(HIN_HER_ITEMS.slice(0, 2))
    const drill = useDirectionDrill(qs)
    drill.pickOption(drill.current.value!.answers[0])
    expect(drill.current.value!.isCorrect).toBe(true)
    drill.advance()
    drill.pickOption(drill.current.value!.answers[0] === 'hin' ? 'her' : 'hin')
    expect(drill.current.value!.isCorrect).toBe(false)
    drill.advance()
    expect(drill.finished.value).toBe(true)
    expect(drill.score.value).toBe(1)
    expect(drill.wrongIndexes.value).toEqual([1])
  })

  test('typed grading folds umlauts and accepts alternatives', () => {
    const item = QUESTION_ITEMS.find(i => i.answers.length > 1)!
    const qs = buildQuestionWordQuestions([item])
    const drill = useDirectionDrill(qs)
    drill.submitText(item.answers[1].toUpperCase())
    expect(drill.current.value!.isCorrect).toBe(true)

    const over = COMPOUND_ITEMS.find(i => i.answers[0] === 'herüber' || i.answers[0] === 'hinüber')!
    const drill2 = useDirectionDrill(buildCompoundQuestions([over], () => 0.1))
    drill2.submitText(over.answers[0].replace('ü', 'ue'))
    expect(drill2.current.value!.isCorrect).toBe(true)
  })

  test('double-answer is ignored; empty input is wrong', () => {
    const drill = useDirectionDrill(buildHinHerQuestions(HIN_HER_ITEMS.slice(0, 1)))
    drill.pickOption(drill.current.value!.answers[0])
    drill.pickOption('hier')
    expect(drill.current.value!.isCorrect).toBe(true)
  })
})
