import { describe, it, expect, beforeEach } from 'vitest'
import {
  CUSTOM_SCHREIBTHEMEN_KEY, THEMEN_PER_GENERATION, loadCustomThemen, addCustomThemen,
  deleteCustomThema, allThemen, doneThemaTitles, drawThema, validateGeneratedThema,
  buildThemaGeneratorPrompt, generateThemen
} from '../../src/composables/useSchreibenThemen'
import { SCHREIBEN_THEMEN, SCHREIBEN_TASK_PREFIX } from '../../src/data/schreibenThemen'

const HISTORY_KEY = 'gt:quizHistory'

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

// 'schreiben-teil1' is not yet a member of QuizHistoryType (a parallel task
// adds it) — write the raw history entry directly rather than going through
// saveQuizRun/QuizHistoryEntry, so this test file doesn't need a premature
// cast just to exercise doneThemaTitles.
function saveSchreibenRun(topicTitle: string, type = 'schreiben-teil1'): void {
  const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  existing.push({
    id: Date.now() + existing.length,
    type,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 1,
    count: 1,
    correct: 1,
    meta: { topicTitle }
  })
  localStorage.setItem(HISTORY_KEY, JSON.stringify(existing))
}

const good = {
  titleDe: 'Camping statt Hotel',
  forumContextDe: 'Im Reiseforum wird diskutiert, ob einfacher Urlaub der bessere Urlaub ist.',
  taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, ob einfacher Urlaub erholsamer ist als Komfortreisen.',
  inhaltspunkte: [
    'Äußern Sie Ihre Meinung zu einfachen Urlaubsformen und begründen Sie sie.',
    'Nennen Sie Vorteile oder Nachteile von Campingurlaub.',
    'Berichten Sie von eigenen Reiseerfahrungen.',
    'Nennen Sie eine Alternative für Menschen, die beides verbinden wollen.'
  ],
  tags: ['Reisen']
}

beforeEach(() => {
  localStorage.removeItem(CUSTOM_SCHREIBTHEMEN_KEY)
  localStorage.removeItem(HISTORY_KEY)
})

describe('the custom pool', () => {
  it('is empty and forgiving when absent or corrupt', () => {
    expect(loadCustomThemen()).toEqual([])
    localStorage.setItem(CUSTOM_SCHREIBTHEMEN_KEY, 'not json')
    expect(loadCustomThemen()).toEqual([])
  })

  it('adds, lists and deletes', () => {
    addCustomThemen([{
      id: 'wt-custom-1', titleDe: 'Testthema',
      forumContextDe: 'Im Testforum wird eine Testfrage diskutiert, die niemand ernst nimmt.',
      taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, wie man testet.',
      inhaltspunkte: ['Punkt eins der Aufgabe.', 'Punkt zwei der Aufgabe.', 'Punkt drei der Aufgabe.', 'Punkt vier der Aufgabe.'],
      tags: ['Bildung'], level: 'B2', source: 'custom'
    }])
    expect(loadCustomThemen()).toHaveLength(1)
    expect(allThemen()).toHaveLength(SCHREIBEN_THEMEN.length + 1)
    deleteCustomThema('wt-custom-1')
    expect(loadCustomThemen()).toEqual([])
  })

  it('forces level and source on load', () => {
    localStorage.setItem(CUSTOM_SCHREIBTHEMEN_KEY, JSON.stringify([
      {
        id: 'wt-custom-2', titleDe: 'X',
        forumContextDe: 'Im Forum X wird diskutiert, ob X sinnvoll ist oder nicht.',
        taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zur Frage, was X ist.',
        inhaltspunkte: ['Punkt eins der Aufgabe.', 'Punkt zwei der Aufgabe.', 'Punkt drei der Aufgabe.', 'Punkt vier der Aufgabe.'],
        tags: ['Medien'], level: 'C1', source: 'seed'
      }
    ]))
    const [t] = loadCustomThemen()
    expect(t.level).toBe('B2')
    expect(t.source).toBe('custom')
  })
})

describe('doneThemaTitles', () => {
  it('reads Teil 1 Runs only', () => {
    saveSchreibenRun('Homeoffice als Normalfall', 'schreiben-teil1')
    saveSchreibenRun('KI im Alltag', 'sprechen-teil1')
    const done = doneThemaTitles()
    expect(done.has('Homeoffice als Normalfall')).toBe(true)
    expect(done.has('KI im Alltag')).toBe(false)
  })
})

describe('drawThema', () => {
  it('returns a thema from the pool deterministically under a fixed rng', () => {
    const t = drawThema(() => 0)
    expect(t.id).toMatch(/^wt-/)
  })

  it('prefers a thema with no graded Run yet', () => {
    for (const t of SCHREIBEN_THEMEN.slice(0, SCHREIBEN_THEMEN.length - 1)) {
      saveSchreibenRun(t.titleDe)
    }
    const undoneId = SCHREIBEN_THEMEN[SCHREIBEN_THEMEN.length - 1].id
    const drawn = drawThema(() => 0)
    expect(drawn.id).toBe(undoneId)
  })

  it('falls back to the whole pool once everything is done', () => {
    for (const t of SCHREIBEN_THEMEN) {
      saveSchreibenRun(t.titleDe)
    }
    const drawn = drawThema(() => 0.5)
    expect(drawn).toBeTruthy()
  })
})

describe('validateGeneratedThema', () => {
  it('accepts a well-formed thema', () => {
    expect(validateGeneratedThema(good)).not.toBeNull()
  })

  it('rejects wrong prefix, question marks, wrong point count, bad tags, missing word-count phrase', () => {
    expect(validateGeneratedThema({ ...good, taskDe: 'Verfassen Sie einen Text über Camping (mindestens 150 Wörter).' })).toBeNull()
    expect(validateGeneratedThema({ ...good, taskDe: good.taskDe.replace('.', '?') })).toBeNull()
    expect(validateGeneratedThema({ ...good, inhaltspunkte: good.inhaltspunkte.slice(0, 3) })).toBeNull()
    expect(validateGeneratedThema({ ...good, tags: ['Quatsch'] })).toBeNull()
    expect(validateGeneratedThema({ ...good, taskDe: 'Schreiben Sie einen Forumsbeitrag ohne Mindestwortzahl.' })).toBeNull()
  })

  it('rejects out-of-range titleDe and forumContextDe', () => {
    expect(validateGeneratedThema({ ...good, titleDe: 'XY' })).toBeNull()
    expect(validateGeneratedThema({ ...good, titleDe: 'x'.repeat(60) })).toBeNull()
    expect(validateGeneratedThema({ ...good, forumContextDe: 'Zu kurz.' })).toBeNull()
    expect(validateGeneratedThema({ ...good, forumContextDe: 'x'.repeat(300) })).toBeNull()
  })

  it('rejects duplicate or malformed Inhaltspunkte', () => {
    expect(validateGeneratedThema({
      ...good,
      inhaltspunkte: [good.inhaltspunkte[0], good.inhaltspunkte[0], good.inhaltspunkte[1], good.inhaltspunkte[2]]
    })).toBeNull()
    expect(validateGeneratedThema({
      ...good,
      inhaltspunkte: ['Zu kurz.', good.inhaltspunkte[1], good.inhaltspunkte[2], good.inhaltspunkte[3]]
    })).toBeNull()
    expect(validateGeneratedThema({
      ...good,
      inhaltspunkte: [good.inhaltspunkte[0] + '?', good.inhaltspunkte[1], good.inhaltspunkte[2], good.inhaltspunkte[3]]
    })).toBeNull()
  })

  it('keeps only known tags when some are unknown', () => {
    const v = validateGeneratedThema({ ...good, tags: ['Reisen', 'Quatsch'] })
    expect(v?.tags).toEqual(['Reisen'])
  })

  it('rejects null and non-object input', () => {
    expect(validateGeneratedThema(null)).toBeNull()
    expect(validateGeneratedThema('nope')).toBeNull()
  })
})

describe('buildThemaGeneratorPrompt', () => {
  it('embeds the avoid-list, the JSON envelope, and the exam constraints in prose', () => {
    const p = buildThemaGeneratorPrompt(['Homeoffice als Normalfall'], new Set(['KI im Alltag']))
    expect(p).toContain('Homeoffice als Normalfall')
    expect(p).toContain('KI im Alltag')
    expect(p).toContain('"themen"')
    expect(p).toContain('mindestens 150 Wörter')
    expect(p).toContain('genau vier')
    expect(p).toContain(SCHREIBEN_TASK_PREFIX)
    expect(p).toContain(String(THEMEN_PER_GENERATION))
  })

  it('has no markdown fences', () => {
    const p = buildThemaGeneratorPrompt([], new Set())
    expect(p).not.toContain('```')
  })
})

describe('generateThemen', () => {
  it('stamps ids, level and source on accepted themes', async () => {
    const { client } = fakeClient([JSON.stringify({ themen: [good] })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out).toHaveLength(1)
    expect(out[0].id).toMatch(/^wt-custom-/)
    expect(out[0].level).toBe('B2')
    expect(out[0].source).toBe('custom')
  })

  it('retries past malformed JSON', async () => {
    const { client, calls } = fakeClient(['not json', JSON.stringify({ themen: [good] })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out).toHaveLength(1)
    expect(calls.length).toBe(2)
  })

  it('throws when nothing usable ever arrives', async () => {
    const { client } = fakeClient(['{}'])
    await expect(generateThemen(client as any, 'gemini-2.5-flash')).rejects.toThrow()
  })

  it('never returns a title already in the pool', async () => {
    const existing = SCHREIBEN_THEMEN[0]
    const dup = { ...good, titleDe: existing.titleDe }
    const { client } = fakeClient([JSON.stringify({ themen: [dup, { ...good, titleDe: 'Ganz neues Thema' }] })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out.map(t => t.titleDe)).toEqual(['Ganz neues Thema'])
  })

  it('caps accepted themen at THEMEN_PER_GENERATION', async () => {
    const many = Array.from({ length: THEMEN_PER_GENERATION + 3 }, (_, i) => ({ ...good, titleDe: `Thema ${i}` }))
    const { client } = fakeClient([JSON.stringify({ themen: many })])
    const out = await generateThemen(client as any, 'gemini-2.5-flash')
    expect(out.length).toBe(THEMEN_PER_GENERATION)
  })
})
