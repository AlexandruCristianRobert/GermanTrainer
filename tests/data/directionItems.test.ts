import { describe, test, expect } from 'vitest'
import { HIN_HER_ITEMS, COMPOUND_ITEMS, QUESTION_ITEMS, ELEMENT_ARCHETYPES } from '../../src/data/directionItems'
import {
  ADVERB_PAIRS, DIRECTION_LEVELS, hinForm, herForm, validSceneSpec,
  type PerspectiveItem,
} from '../../src/data/directionWords'

const ELEMENTS = ADVERB_PAIRS.map(p => p.element)

function baseChecks(items: { id: string; level: string; sentence: string; translation?: string }[]) {
  expect(new Set(items.map(i => i.id)).size).toBe(items.length)
  const bad = items.filter(i =>
    !(DIRECTION_LEVELS as readonly string[]).includes(i.level)
    || (i.sentence.match(/___/g) ?? []).length !== 1
    || (i.translation ?? '').trim().length === 0
  )
  expect(bad.map(i => i.id)).toEqual([])
}

function sceneChecks(items: PerspectiveItem[]) {
  const bad = items.filter(i => !validSceneSpec(i.scene))
  expect(bad.map(i => i.id)).toEqual([])
}

describe('HIN_HER_ITEMS (T1)', () => {
  test('base + scene invariants', () => { baseChecks(HIN_HER_ITEMS); sceneChecks(HIN_HER_ITEMS) })

  test('answers are exactly bare hin or her, pair is null', () => {
    const bad = HIN_HER_ITEMS.filter(i =>
      i.pair !== null || i.answers.length !== 1 || !['hin', 'her'].includes(i.answers[0]))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('PERSPECTIVE GATE: her ⟺ toward-speaker, hin ⟺ away-from-speaker', () => {
    const bad = HIN_HER_ITEMS.filter(i =>
      (i.answers[0] === 'her') !== (i.scene.motion === 'toward-speaker'))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('sentence never contains the answer as a standalone word', () => {
    const bad = HIN_HER_ITEMS.filter(i =>
      new RegExp(`(^|[^a-zäöüß])${i.answers[0]}($|[^a-zäöüß])`, 'i').test(i.sentence))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥30 total, ≥12 per side, ≥5 hier-trap items', () => {
    expect(HIN_HER_ITEMS.length).toBeGreaterThanOrEqual(30)
    expect(HIN_HER_ITEMS.filter(i => i.answers[0] === 'hin').length).toBeGreaterThanOrEqual(12)
    expect(HIN_HER_ITEMS.filter(i => i.answers[0] === 'her').length).toBeGreaterThanOrEqual(12)
    expect(HIN_HER_ITEMS.filter(i => i.hierTrap).length).toBeGreaterThanOrEqual(5)
  })
})

describe('COMPOUND_ITEMS (T2)', () => {
  test('base + scene invariants', () => { baseChecks(COMPOUND_ITEMS); sceneChecks(COMPOUND_ITEMS) })

  test('pair is a real element; single answer', () => {
    const bad = COMPOUND_ITEMS.filter(i =>
      i.pair === null || !ELEMENTS.includes(i.pair) || i.answers.length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('PERSPECTIVE GATE: answer derives from pair + scene motion', () => {
    const bad = COMPOUND_ITEMS.filter(i => {
      const expected = i.scene.motion === 'toward-speaker' ? herForm(i.pair!) : hinForm(i.pair!)
      return i.answers[0] !== expected
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('scene archetype is plausible for the element', () => {
    const bad = COMPOUND_ITEMS.filter(i => !ELEMENT_ARCHETYPES[i.pair!].includes(i.scene.archetype))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('sentence never contains the answer', () => {
    const bad = COMPOUND_ITEMS.filter(i => i.sentence.toLowerCase().includes(i.answers[0].toLowerCase()))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥48 total; ≥8 per r-form pair, ≥4 for ab; levels A2≥10, B1≥14, B2≥10, C1≥6', () => {
    expect(COMPOUND_ITEMS.length).toBeGreaterThanOrEqual(48)
    for (const p of ADVERB_PAIRS) {
      const n = COMPOUND_ITEMS.filter(i => i.pair === p.element).length
      expect(n, `pair ${p.element}`).toBeGreaterThanOrEqual(p.rForm ? 8 : 4)
    }
    const byLevel = (l: string) => COMPOUND_ITEMS.filter(i => i.level === l).length
    expect(byLevel('A2')).toBeGreaterThanOrEqual(10)
    expect(byLevel('B1')).toBeGreaterThanOrEqual(14)
    expect(byLevel('B2')).toBeGreaterThanOrEqual(10)
    expect(byLevel('C1')).toBeGreaterThanOrEqual(6)
  })
})

describe('QUESTION_ITEMS (T3)', () => {
  const ALLOWED = ['wo', 'wohin', 'woher', 'dahin', 'dorthin', 'hierher', 'daher']

  test('base invariants', () => { baseChecks(QUESTION_ITEMS) })

  test('answers allowed and non-empty; options 3-4 unique containing exactly one answer', () => {
    const bad = QUESTION_ITEMS.filter(i => {
      const optOk = i.options.length >= 3 && i.options.length <= 4
        && new Set(i.options).size === i.options.length
        && i.options.filter(o => i.answers.includes(o)).length === 1
      const ansOk = i.answers.length >= 1 && i.answers.every(a => ALLOWED.includes(a))
      return !(optOk && ansOk)
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥30 total; wo≥6, wohin≥8, woher≥8; pointers≥4; split forms≥2', () => {
    expect(QUESTION_ITEMS.length).toBeGreaterThanOrEqual(30)
    const byAnswer = (w: string) => QUESTION_ITEMS.filter(i => i.answers[0] === w).length
    expect(byAnswer('wo')).toBeGreaterThanOrEqual(6)
    expect(byAnswer('wohin')).toBeGreaterThanOrEqual(8)
    expect(byAnswer('woher')).toBeGreaterThanOrEqual(8)
    const pointers = QUESTION_ITEMS.filter(i => ['dahin', 'dorthin', 'hierher', 'daher'].includes(i.answers[0]))
    expect(pointers.length).toBeGreaterThanOrEqual(4)
    const splits = QUESTION_ITEMS.filter(i => i.answers[0] === 'wo' && / (hin|her)\?/.test(i.sentence))
    expect(splits.length).toBeGreaterThanOrEqual(2)
  })
})
