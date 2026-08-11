import { describe, test, expect } from 'vitest'
import { PASSIVE_ITEMS, REFLEXIVE_ITEMS, REFLEXIVE_CONTRAST_VERBS } from '../../src/data/dativeConsequences'
import { DATIVE_DRILL_LEVELS } from '../../src/data/dativeExperiencer'
import { DATIVE_VERBS } from '../../src/data/dativeVerbs'
import { VERBS } from '../../src/data/verbs'

const byGerman = new Map(VERBS.map(v => [v.german, v]))

function containsWord(text: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-zäöüß])${esc}($|[^a-zäöüß])`, 'i').test(text)
}

function baseChecks(items: { id: string; level: string; translation: string; explanation: string }[]) {
  expect(new Set(items.map(i => i.id)).size).toBe(items.length)
  const bad = items.filter(i =>
    !(DATIVE_DRILL_LEVELS as readonly string[]).includes(i.level)
    || i.translation.trim().length === 0
    || i.explanation.trim().length === 0)
  expect(bad.map(i => i.id)).toEqual([])
}

describe('PASSIVE_ITEMS (T12)', () => {
  test('base invariants', () => baseChecks(PASSIVE_ITEMS))

  test('cross-ref: dative items name DATIVE_VERBS keys; accusative contrast items are accusative in VERBS and agreement-kind only', () => {
    const bad = PASSIVE_ITEMS.filter(i => i.verbCase === 'dative'
      ? !(i.verb in DATIVE_VERBS)
      : byGerman.get(i.verb)?.case !== 'accusative' || i.kind !== 'agreement')
    expect(bad.map(i => `${i.id}:${i.verb}`)).toEqual([])
  })

  test('options: 2 unique, exactly one is the answer', () => {
    const bad = PASSIVE_ITEMS.filter(i =>
      i.options.length !== 2 || new Set(i.options).size !== 2
      || i.answers.length !== 1 || i.options.filter(o => i.answers.includes(o)).length !== 1)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('TRANSFORM GATE: the prompt shows the active sentence + question; the correct passive is impersonal (wird, never werden)', () => {
    const bad = PASSIVE_ITEMS.filter(i => i.kind === 'transform' && (
      !i.prompt.endsWith(' — Wie lautet das Passiv?')
      || i.prompt.includes('___')
      || !containsWord(i.answers[0], 'wird')
      || containsWord(i.answers[0], 'werden')))
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('AGREEMENT GATE: one gap, options exactly wird/werden; dative → wird (verb frozen 3sg), accusative contrast → werden', () => {
    const bad = PASSIVE_ITEMS.filter(i => {
      if (i.kind !== 'agreement') return false
      const optSet = new Set(i.options)
      if ((i.prompt.match(/___/g) ?? []).length !== 1) return true
      if (optSet.size !== 2 || !optSet.has('wird') || !optSet.has('werden')) return true
      return i.verbCase === 'dative' ? i.answers[0] !== 'wird' : i.answers[0] !== 'werden'
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('ES GATE: es is a pure position-1 placeholder — es-first keeps it up front, fronted drops it', () => {
    const bad = PASSIVE_ITEMS.filter(i => {
      if (i.kind !== 'es') return false
      if (i.prompt !== 'Welcher Satz ist richtig?') return true
      const wrong = i.options.find(o => !i.answers.includes(o))
      if (!wrong) return true
      if (i.esPattern === 'es-first') return !i.answers[0].startsWith('Es wird') || wrong.startsWith('Es')
      if (i.esPattern === 'fronted') return containsWord(i.answers[0], 'es') || !containsWord(wrong, 'es')
      return true
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('floors: ≥8 transform, ≥8 agreement (both cases present — never one-button-winnable), ≥6 es (both patterns)', () => {
    expect(PASSIVE_ITEMS.filter(i => i.kind === 'transform').length).toBeGreaterThanOrEqual(8)
    const agr = PASSIVE_ITEMS.filter(i => i.kind === 'agreement')
    expect(agr.length).toBeGreaterThanOrEqual(8)
    expect(agr.filter(i => i.verbCase === 'dative').length).toBeGreaterThanOrEqual(5)
    expect(agr.filter(i => i.verbCase === 'accusative').length).toBeGreaterThanOrEqual(3)
    const es = PASSIVE_ITEMS.filter(i => i.kind === 'es')
    expect(es.length).toBeGreaterThanOrEqual(6)
    expect(es.filter(i => i.esPattern === 'es-first').length).toBeGreaterThanOrEqual(2)
    expect(es.filter(i => i.esPattern === 'fronted').length).toBeGreaterThanOrEqual(2)
  })
})

describe('REFLEXIVE_ITEMS (T13)', () => {
  test('base invariants', () => baseChecks(REFLEXIVE_ITEMS))

  test('REFLEXIVE GATE: dative kind proves its accusative object sits in the prompt; accusative kind has none', () => {
    const bad = REFLEXIVE_ITEMS.filter(i => i.kind === 'dative'
      ? !i.accObject || !containsWord(i.prompt, i.accObject)
      : i.accObject !== undefined)
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('pronoun wiring: one gap; options are the person-matched mir/mich or dir/dich pair; answer case matches kind', () => {
    const PAIRS: Record<string, string[]> = {
      mir: ['mir', 'mich'], mich: ['mir', 'mich'],
      dir: ['dir', 'dich'], dich: ['dir', 'dich'],
    }
    const DATIVE_FORMS = ['mir', 'dir']
    const bad = REFLEXIVE_ITEMS.filter(i => {
      if ((i.prompt.match(/___/g) ?? []).length !== 1) return true
      if (i.answers.length !== 1) return true
      const pair = PAIRS[i.answers[0]]
      if (!pair) return true
      if (new Set(i.options).size !== 2 || !pair.every(p => i.options.includes(p))) return true
      const isDativeForm = DATIVE_FORMS.includes(i.answers[0])
      return (i.kind === 'dative') !== isDativeForm
    })
    expect(bad.map(i => i.id)).toEqual([])
  })

  test('contrast pairs: every contrast verb appears in BOTH kinds (the mich/mir minimal pairs are the lesson)', () => {
    for (const v of REFLEXIVE_CONTRAST_VERBS) {
      expect(REFLEXIVE_ITEMS.some(i => i.verb === v && i.kind === 'dative'), `${v} dative`).toBe(true)
      expect(REFLEXIVE_ITEMS.some(i => i.verb === v && i.kind === 'accusative'), `${v} accusative`).toBe(true)
    }
  })

  test('floors: ≥20 total, ≥12 dative, ≥9 accusative, ≥5 contrast verbs', () => {
    expect(REFLEXIVE_ITEMS.length).toBeGreaterThanOrEqual(20)
    expect(REFLEXIVE_ITEMS.filter(i => i.kind === 'dative').length).toBeGreaterThanOrEqual(12)
    expect(REFLEXIVE_ITEMS.filter(i => i.kind === 'accusative').length).toBeGreaterThanOrEqual(9)
    expect(REFLEXIVE_CONTRAST_VERBS.length).toBeGreaterThanOrEqual(5)
  })
})
