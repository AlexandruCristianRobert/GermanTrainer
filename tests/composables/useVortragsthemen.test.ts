import { describe, it, expect, beforeEach } from 'vitest'
import {
  CUSTOM_VORTRAGSTHEMEN_KEY, THEMEN_PER_GENERATION, loadCustomThemen, addCustomThemen,
  deleteCustomThema, allThemen, doneThemaTitles, drawThemaPair, validateGeneratedThema,
  buildThemaGeneratorPrompt, generateThemen
} from '../../src/composables/useVortragsthemen'
import { SPRECHEN_VORTRAGSTHEMEN } from '../../src/data/sprechenVortragsthemen'
import { saveQuizRun } from '../../src/composables/useQuizHistory'

function fakeClient(responses: string[]) {
  let i = 0
  const calls: string[] = []
  return {
    client: {
      models: {
        generateContent: async (opts: { contents: string }) => {
          calls.push(opts.contents)
          return { text: responses[Math.min(i++, responses.length - 1)] }
        }
      }
    },
    calls
  }
}

beforeEach(() => {
  localStorage.removeItem(CUSTOM_VORTRAGSTHEMEN_KEY)
  localStorage.removeItem('gt:quizHistory')
})

describe('the custom pool', () => {
  it('is empty and forgiving when absent or corrupt', () => {
    expect(loadCustomThemen()).toEqual([])
    localStorage.setItem(CUSTOM_VORTRAGSTHEMEN_KEY, 'not json')
    expect(loadCustomThemen()).toEqual([])
  })

  it('adds, lists and deletes', () => {
    addCustomThemen([{ id: 'vt-custom-1', titleDe: 'Testthema', taskDe: 'Halten Sie einen kurzen Vortrag darüber, wie man testet.', tags: ['Bildung'], level: 'B2', source: 'custom' }])
    expect(loadCustomThemen()).toHaveLength(1)
    expect(allThemen()).toHaveLength(SPRECHEN_VORTRAGSTHEMEN.length + 1)
    deleteCustomThema('vt-custom-1')
    expect(loadCustomThemen()).toEqual([])
  })

  it('forces level and source on load', () => {
    localStorage.setItem(CUSTOM_VORTRAGSTHEMEN_KEY, JSON.stringify([
      { id: 'vt-custom-2', titleDe: 'X', taskDe: 'Halten Sie einen kurzen Vortrag darüber, was X ist.', tags: ['Medien'], level: 'C1', source: 'seed' }
    ]))
    const [t] = loadCustomThemen()
    expect(t.level).toBe('B2')
    expect(t.source).toBe('custom')
  })
})

describe('doneThemaTitles', () => {
  it('reads Teil 1 Runs only', () => {
    saveQuizRun({ type: 'sprechen-teil1', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 1, count: 1, correct: 1, meta: { topicTitle: 'Ehrenamtliches Engagement' } })
    saveQuizRun({ type: 'sprechen-teil2', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 1, count: 1, correct: 1, meta: { topicTitle: 'Autofreie Innenstädte' } })
    const done = doneThemaTitles()
    expect(done.has('Ehrenamtliches Engagement')).toBe(true)
    expect(done.has('Autofreie Innenstädte')).toBe(false)
  })
})

describe('drawThemaPair', () => {
  it('draws two distinct themes', () => {
    const [a, b] = drawThemaPair(() => 0)
    expect(a.id).not.toBe(b.id)
  })

  it('prefers themes with no graded Vortrag', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN.slice(0, SPRECHEN_VORTRAGSTHEMEN.length - 2)) {
      saveQuizRun({ type: 'sprechen-teil1', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 1, count: 1, correct: 1, meta: { topicTitle: t.titleDe } })
    }
    const undone = SPRECHEN_VORTRAGSTHEMEN.slice(-2).map(t => t.id)
    const [a, b] = drawThemaPair(() => 0)
    expect(undone).toContain(a.id)
    expect(undone).toContain(b.id)
  })

  it('falls back to the whole pool when everything is done', () => {
    for (const t of SPRECHEN_VORTRAGSTHEMEN) {
      saveQuizRun({ type: 'sprechen-teil1', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 1, count: 1, correct: 1, meta: { topicTitle: t.titleDe } })
    }
    const [a, b] = drawThemaPair(() => 0.5)
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })
})

describe('validateGeneratedThema', () => {
  const ok = { titleDe: 'Ehrenamt im Dorf', taskDe: 'Halten Sie einen kurzen Vortrag darüber, wie Vereine ein Dorf zusammenhalten.', tags: ['Gesellschaft'] }

  it('accepts a well-formed theme', () => {
    expect(validateGeneratedThema(ok)).not.toBeNull()
  })

  it('rejects a thesis-shaped task', () => {
    expect(validateGeneratedThema({ ...ok, taskDe: 'Sollten Vereine mehr Geld bekommen?' })).toBeNull()
  })

  it('rejects a task that is not the exam instruction', () => {
    expect(validateGeneratedThema({ ...ok, taskDe: 'Sprechen Sie über Vereine im Dorf und deren Rolle heute.' })).toBeNull()
  })

  it('rejects empty, over-long and unknown-tag input', () => {
    expect(validateGeneratedThema({ ...ok, titleDe: '' })).toBeNull()
    expect(validateGeneratedThema({ ...ok, titleDe: 'x'.repeat(60) })).toBeNull()
    expect(validateGeneratedThema({ ...ok, tags: ['Sport'] })).toBeNull()
    expect(validateGeneratedThema(null)).toBeNull()
  })

  it('keeps only known tags when some are unknown', () => {
    const v = validateGeneratedThema({ ...ok, tags: ['Gesellschaft', 'Sport'] })
    expect(v?.tags).toEqual(['Gesellschaft'])
  })
})

describe('buildThemaGeneratorPrompt', () => {
  it('spells out the JSON envelope in prose — the local-claude bridge drops responseSchema', () => {
    const p = buildThemaGeneratorPrompt(['A'], ['B'])
    expect(p).toContain('"themen"')
    expect(p).toContain('titleDe')
    expect(p).toContain('taskDe')
    expect(p).toContain('Halten Sie einen kurzen Vortrag darüber')
    expect(p).toContain(String(THEMEN_PER_GENERATION))
  })

  it('passes both avoid-lists to the model', () => {
    const p = buildThemaGeneratorPrompt(['Vorhandenes Thema'], ['Gehaltenes Thema'])
    expect(p).toContain('Vorhandenes Thema')
    expect(p).toContain('Gehaltenes Thema')
  })
})

describe('generateThemen', () => {
  it('stamps ids, level and source on accepted themes', async () => {
    const { client } = fakeClient([JSON.stringify({ themen: [
      { titleDe: 'Fahrrad in der Stadt', taskDe: 'Halten Sie einen kurzen Vortrag darüber, wie das Fahrrad den Verkehr verändert.', tags: ['Umwelt'] }
    ] })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out).toHaveLength(1)
    expect(out[0].id).toMatch(/^vt-custom-/)
    expect(out[0].level).toBe('B2')
    expect(out[0].source).toBe('custom')
  })

  it('retries past malformed JSON', async () => {
    const { client, calls } = fakeClient(['not json', JSON.stringify({ themen: [
      { titleDe: 'Musik im Alltag', taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle Musik im Alltag spielt.', tags: ['Medien'] }
    ] })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out).toHaveLength(1)
    expect(calls.length).toBe(2)
  })

  it('throws when nothing usable ever arrives', async () => {
    const { client } = fakeClient(['{}'])
    await expect(generateThemen(client as any, 'gemini-2.5-flash')).rejects.toThrow()
  })

  it('never returns a title already in the pool', async () => {
    const existing = SPRECHEN_VORTRAGSTHEMEN[0]
    const { client } = fakeClient([JSON.stringify({ themen: [
      { titleDe: existing.titleDe, taskDe: existing.taskDe, tags: existing.tags },
      { titleDe: 'Ganz neues Thema', taskDe: 'Halten Sie einen kurzen Vortrag darüber, warum Neues schwerfällt.', tags: ['Bildung'] }
    ] })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out.map(t => t.titleDe)).toEqual(['Ganz neues Thema'])
  })
})
