import { describe, test, expect, beforeEach } from 'vitest'
import { buildExport, applyImport } from '../../src/composables/useUserData'

// Minimal localStorage shim — vitest's env has localStorage thanks to
// jsdom, but it leaks between tests so we reset it.
beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear()
})

describe('buildExport', () => {
  test('returns a versioned envelope with parsed JSON values', () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('gt:testVerbSize', '30')
    localStorage.setItem(
      'gt:palette',
      JSON.stringify({ light: { paper: '#FFF' }, dark: {} })
    )
    const out = buildExport()
    expect(out.schema).toBe(1)
    expect(out.app).toBe('german-trainer')
    expect(typeof out.exportedAt).toBe('string')
    expect(out.data['theme']).toBe('dark')
    // numbers come back as parsed numbers when stored as JSON-like strings
    expect(out.data['gt:testVerbSize']).toBe(30)
    expect(out.data['gt:palette']).toEqual({ light: { paper: '#FFF' }, dark: {} })
  })

  test('omits absent keys', () => {
    const out = buildExport()
    expect(out.data['theme']).toBeUndefined()
    expect(out.data['gt:quizHistory']).toBeUndefined()
  })

  test('preposition setup keys are recognized', () => {
    localStorage.setItem('prepCaseSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
    localStorage.setItem('prepArticleSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
    localStorage.setItem('prepTwoWaySetup', JSON.stringify({ count: 5 }))
    const out = buildExport()
    expect(out.data['prepCaseSetup']).toEqual({ levels: ['A1'], count: 10 })
    expect(out.data['prepArticleSetup']).toEqual({ levels: ['A1'], count: 10 })
    expect(out.data['prepTwoWaySetup']).toEqual({ count: 5 })
  })

  test('declension setup keys are recognized', () => {
    localStorage.setItem('declTableSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
    localStorage.setItem('declArticleSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
    localStorage.setItem('declAdjectiveSetup', JSON.stringify({ levels: ['A1'], count: 10 }))
    const out = buildExport()
    expect(out.data['declTableSetup']).toEqual({ levels: ['A1'], count: 10 })
    expect(out.data['declArticleSetup']).toEqual({ levels: ['A1'], count: 10 })
    expect(out.data['declAdjectiveSetup']).toEqual({ levels: ['A1'], count: 10 })
  })

  test('declension v2 setup keys are recognized', () => {
    localStorage.setItem('declPronounSetup', JSON.stringify({ categories: ['personal'], count: 10 }))
    localStorage.setItem('declCRSetup', JSON.stringify({ levels: ['A1'], cases: ['accusative'], count: 10 }))
    const out = buildExport()
    expect(out.data['declPronounSetup']).toEqual({ categories: ['personal'], count: 10 })
    expect(out.data['declCRSetup']).toEqual({ levels: ['A1'], cases: ['accusative'], count: 10 })
  })

  test('AI article setup key is recognized', () => {
    localStorage.setItem('declArticleAISetup', JSON.stringify({ difficulty: 'medium', count: 10 }))
    const out = buildExport()
    expect(out.data['declArticleAISetup']).toEqual({ difficulty: 'medium', count: 10 })
  })
})

describe('applyImport', () => {
  test('accepts the full envelope', () => {
    const result = applyImport({
      schema: 1,
      exportedAt: '2026-05-24T00:00:00.000Z',
      app: 'german-trainer',
      data: {
        theme: 'dark',
        'gt:testVerbSize': 30
      }
    })
    expect(result.imported).toContain('theme')
    expect(result.imported).toContain('gt:testVerbSize')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(localStorage.getItem('gt:testVerbSize')).toBe('30')
  })

  test('accepts a flat data map', () => {
    const result = applyImport({
      theme: 'light',
      'gt:palette': { light: { ink: '#000' }, dark: {} }
    })
    expect(result.imported).toContain('theme')
    expect(result.imported).toContain('gt:palette')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(JSON.parse(localStorage.getItem('gt:palette')!)).toEqual({
      light: { ink: '#000' },
      dark: {}
    })
  })

  test('skips unknown keys and reports them', () => {
    const result = applyImport({
      theme: 'dark',
      'gt:evilSecret': 'oh no'
    })
    expect(result.imported).toContain('theme')
    expect(result.skipped.map(s => s.key)).toContain('gt:evilSecret')
    expect(localStorage.getItem('gt:evilSecret')).toBeNull()
  })

  test('throws on non-object input', () => {
    expect(() => applyImport('not an object')).toThrow()
    expect(() => applyImport(null)).toThrow()
  })

  test('rebuilding from the export round-trips a quiz-history blob', () => {
    const history = [
      {
        id: 1,
        type: 'verb-translation',
        startedAt: '2026-05-23T10:00:00.000Z',
        finishedAt: '2026-05-23T10:01:00.000Z',
        durationMs: 60000,
        count: 10,
        correct: 7,
        meta: { levels: ['A1'], types: ['regular'] }
      }
    ]
    localStorage.setItem('gt:quizHistory', JSON.stringify(history))
    const exported = buildExport()
    localStorage.clear()
    applyImport(exported)
    expect(JSON.parse(localStorage.getItem('gt:quizHistory')!)).toEqual(history)
  })
})
