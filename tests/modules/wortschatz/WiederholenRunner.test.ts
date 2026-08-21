// Task 11 — WiederholenRunner (Wiederholsitzung). Drives the real cards, the
// real scheduler and a real (fake-indexeddb) Dexie; only the AI settings and
// the AI client are mocked, so `canUseAi` can be flipped per test.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import WiederholenRunner from '../../../src/modules/wortschatz/WiederholenRunner.vue'
import { db } from '../../../src/db'
import { newProgress, type StoredFsrsCard, type VokabelProgress } from '../../../src/composables/wortschatzScheduler'
import { WORTSCHATZ_VOKABELN, clozeParts, type Stufe } from '../../../src/data/wortschatz'
import { loadHistory } from '../../../src/composables/useQuizHistory'

const { aiFlags, generateContentMock } = vi.hoisted(() => ({
  aiFlags: { enabled: false },
  generateContentMock: vi.fn()
}))

// `canUseAi` is a bare getter object rather than a computed: the runner only
// reads `.value`, and a hoisted plain flag lets each test pick online/offline.
vi.mock('../../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({
        id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test',
        aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low'
      }),
      hasApiKey: { get value() { return aiFlags.enabled } },
      canUseAi: { get value() { return aiFlags.enabled } },
      load: async () => {},
      save: async () => {}
    })
  }
})

vi.mock('../../../src/composables/localClaude', () => ({
  resolveAiClient: () => ({ models: { generateContent: generateContentMock } })
}))

const DAY = 86_400_000
const LUECKE_V = WORTSCHATZ_VOKABELN.find(v => v.id === 'vk-umwelt-verpackung')!
const ABRUF_V = WORTSCHATZ_VOKABELN.find(v => v.id === 'vk-umwelt-massnahme-ergreifen')!

/** A due progress row: newProgress, then stufe/due (and optionally reps) forced. */
function dueRow(
  vokabelId: string, stufe: Stufe, overdueDays: number,
  extra: Partial<Omit<VokabelProgress, 'fsrs'>> = {},
  fsrs: Partial<StoredFsrsCard> = {}
): VokabelProgress {
  const now = Date.now()
  const p = newProgress(vokabelId, now - 30 * DAY)
  return {
    ...p,
    ...extra,
    stufe,
    fsrs: { ...p.fsrs, ...fsrs, due: now - overdueDays * DAY }
  }
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/wortschatz', name: 'wortschatz', component: { template: '<div />' } },
      { path: '/wortschatz/wiederholen/run', name: 'wortschatz-wiederholen-run', component: { template: '<div />' } }
    ]
  })
}

async function mountRunner() {
  const router = makeRouter()
  await router.push({ name: 'wortschatz-wiederholen-run' })
  const wrapper = mount(WiederholenRunner, { global: { plugins: [router] } })
  // Mount chains loadSettings → dueVokabeln (allVokabeln + readAllProgress) →
  // per-item loadExtraSaetze; each Dexie hop needs its own flush.
  for (let i = 0; i < 5; i++) await flushPromises()
  return wrapper
}

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find(b => b.text() === text || b.text().startsWith(text))
}

/** Type `answer` into the visible card's input and submit it. */
async function answerTyped(wrapper: ReturnType<typeof mount>, answer: string) {
  await wrapper.find('input').setValue(answer)
  await wrapper.find('input').trigger('keydown.enter')
  await flushPromises()
  await nextTick()
}

async function clickWeiter(wrapper: ReturnType<typeof mount>) {
  await findButton(wrapper, 'Weiter')!.trigger('click')
  await flushPromises()
  await flushPromises()
}

async function readProgress(id: string): Promise<VokabelProgress> {
  const row = await db.wortschatzProgress.get(id)
  expect(row).toBeTruthy()
  return row!
}

beforeEach(async () => {
  aiFlags.enabled = false
  generateContentMock.mockReset()
  localStorage.clear()
  await db.wortschatzProgress.clear()
  await db.wortschatzCustom.clear()
  await db.wortschatzSaetze.clear()
})

describe('WiederholenRunner — offline session', () => {
  it('serves the due queue per Stufe, records the run, and applies one outcome per card', async () => {
    // Lücke first (more overdue), Abruf second — dueVokabeln sorts by due asc
    // and buildWiederholQueue keeps that order for a single-Themenfeld queue.
    await db.wortschatzProgress.bulkPut([
      dueRow(LUECKE_V.id, 'luecke', 3),
      dueRow(ABRUF_V.id, 'abruf', 1)
    ])
    const wrapper = await mountRunner()

    // Header: x / y + feld + Stufe chip.
    expect(wrapper.find('[data-testid="wz-counter"]').text()).toBe('1 / 2')
    expect(wrapper.find('[data-testid="wz-feld"]').text()).toContain('Umwelt')
    expect(wrapper.find('[data-testid="wz-stufe"]').text()).toBe('Lücke')

    // Card 1 — Lücke on saetze[0] (fsrs.reps === 0), answered correctly.
    const parts = clozeParts(LUECKE_V.saetze[0].de)!
    expect(wrapper.text()).toContain(parts.before.trim())
    await answerTyped(wrapper, parts.blank)
    expect(wrapper.text()).toContain('Richtig.')
    await clickWeiter(wrapper)

    // Card 2 — Abruf, answered wrong; offline rescue resolves false.
    expect(wrapper.find('[data-testid="wz-counter"]').text()).toBe('2 / 2')
    expect(wrapper.find('[data-testid="wz-stufe"]').text()).toBe('Abruf')
    expect(wrapper.text()).toContain(ABRUF_V.en)
    await answerTyped(wrapper, 'völlig danebengegriffen')
    expect(generateContentMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Nicht ganz.')
    await clickWeiter(wrapper)

    // Summary: 1 of 2 right.
    expect(wrapper.find('[data-testid="wz-summary"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wz-score"]').text()).toBe('1 / 2')
    expect(wrapper.text()).toContain('Lücke')
    expect(wrapper.text()).toContain('Abruf')

    // History.
    const runs = loadHistory().filter(r => r.type === 'wortschatz-wiederholen')
    expect(runs).toHaveLength(1)
    expect(runs[0].count).toBe(2)
    expect(runs[0].correct).toBe(1)
    expect(typeof runs[0].startedAt).toBe('string')
    expect(Number.isNaN(Date.parse(runs[0].finishedAt))).toBe(false)

    // Scheduler effects: the right answer advanced the gate, the wrong one
    // demoted a rung and reset it. Exactly one outcome per card.
    const luecke = await readProgress(LUECKE_V.id)
    expect(luecke.stufe).toBe('luecke')
    expect(luecke.gatePasses).toBe(1)
    expect(luecke.fsrs.reps).toBe(1)

    const abruf = await readProgress(ABRUF_V.id)
    expect(abruf.stufe).toBe('luecke')
    expect(abruf.gatePasses).toBe(0)
    expect(abruf.fsrs.reps).toBe(1)
  })

  it('rotates the Lücke sentence by fsrs.reps over saetze + cached extras', async () => {
    await db.wortschatzProgress.put(dueRow(LUECKE_V.id, 'luecke', 2, {}, { reps: 1 }))
    const wrapper = await mountRunner()
    const second = clozeParts(LUECKE_V.saetze[1].de)!
    expect(wrapper.text()).toContain(second.before.trim())

    // With one cached extra Satz the rotation is over three sentences, so
    // reps 3 lands back on saetze[0].
    await db.wortschatzSaetze.put({
      vokabelId: LUECKE_V.id,
      saetze: [{ de: 'Der Hersteller wirbt mit einer besonders leichten {{Verpackung}} aus Papier.', en: 'The producer advertises a particularly light paper packaging.' }],
      generatedAt: Date.now()
    })
    await db.wortschatzProgress.put(dueRow(LUECKE_V.id, 'luecke', 2, {}, { reps: 2 }))
    const w2 = await mountRunner()
    expect(w2.text()).toContain('Der Hersteller wirbt')
  })

  it('falls back to Abruf for an Anwendung item when offline, and blocks promotion', async () => {
    await db.wortschatzProgress.put(dueRow(ABRUF_V.id, 'anwendung', 1))
    const wrapper = await mountRunner()

    // Stored Stufe is still Anwendung in the chip; the rendered card is Abruf.
    expect(wrapper.find('[data-testid="wz-stufe"]').text()).toBe('Anwendung')
    expect(wrapper.find('textarea').exists()).toBe(false)
    await answerTyped(wrapper, ABRUF_V.de)
    expect(wrapper.text()).toContain('Richtig.')
    await clickWeiter(wrapper)

    const p = await readProgress(ABRUF_V.id)
    expect(p.stufe).toBe('anwendung')
    expect(p.gefestigt).toBe(false)
    expect(p.gatePasses).toBe(0) // served below its Stufe → gate does not move
  })

  it('caps the sitting at 20 items and says how many are still fällig', async () => {
    await db.wortschatzProgress.bulkPut(
      WORTSCHATZ_VOKABELN.slice(0, 23).map((v, i) => dueRow(v.id, 'erkennen', 23 - i))
    )
    const wrapper = await mountRunner()
    expect(wrapper.find('[data-testid="wz-counter"]').text()).toBe('1 / 20')
    expect(wrapper.find('[data-testid="wz-cap"]').text()).toContain('3 weitere fällig')
  })

  it('shows a "Nichts fällig" state and records nothing when the queue is empty', async () => {
    const wrapper = await mountRunner()
    expect(wrapper.find('[data-testid="wz-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Nichts fällig')
    expect(loadHistory()).toHaveLength(0)
  })
})

describe('WiederholenRunner — rescue-check contract', () => {
  it('accepts a stored learnedVariant locally, without asking the AI', async () => {
    aiFlags.enabled = true
    await db.wortschatzProgress.put(
      dueRow(LUECKE_V.id, 'abruf', 1, { learnedVariants: ['die Verpackungen'] })
    )
    const wrapper = await mountRunner()

    await answerTyped(wrapper, 'die Verpackungen')
    expect(generateContentMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Richtig.')
    await clickWeiter(wrapper)

    const p = await readProgress(LUECKE_V.id)
    expect(p.gatePasses).toBe(1)
    expect(p.learnedVariants).toEqual(['die Verpackungen'])
  })

  it('banks an AI-accepted answer into learnedVariants (deduped) and counts it right', async () => {
    aiFlags.enabled = true
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ acceptable: true, begruendung: 'Nur eine andere Zahl.' })
    })
    await db.wortschatzProgress.put(dueRow(LUECKE_V.id, 'abruf', 1))
    const wrapper = await mountRunner()

    await answerTyped(wrapper, 'die Verpackungen')
    await flushPromises()
    expect(generateContentMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Richtig.')
    await clickWeiter(wrapper)

    const p = await readProgress(LUECKE_V.id)
    expect(p.learnedVariants).toEqual(['die Verpackungen'])
    expect(p.gatePasses).toBe(1)
  })

  it('treats a thrown/garbage AI verdict as not rescued', async () => {
    aiFlags.enabled = true
    generateContentMock.mockRejectedValue(new Error('network down'))
    await db.wortschatzProgress.put(dueRow(LUECKE_V.id, 'abruf', 1))
    const wrapper = await mountRunner()

    await answerTyped(wrapper, 'die Verpackungen')
    await flushPromises()
    expect(wrapper.text()).toContain('Nicht ganz.')
    await clickWeiter(wrapper)

    const p = await readProgress(LUECKE_V.id)
    expect(p.stufe).toBe('luecke')
    expect(p.learnedVariants).toEqual([])
  })
})

describe('WiederholenRunner — Anwendung grading', () => {
  it('grades the learner sentence online and applies the verdict on Weiter', async () => {
    aiFlags.enabled = true
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ correct: true, feedback: 'Sauber verwendet.' })
    })
    await db.wortschatzProgress.put(dueRow(ABRUF_V.id, 'anwendung', 1))
    const wrapper = await mountRunner()

    expect(wrapper.find('textarea').exists()).toBe(true)
    await wrapper.find('textarea').setValue('Die Stadt muss endlich eine Maßnahme ergreifen.')
    await findButton(wrapper, 'Absenden')!.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('Sauber verwendet.')

    await clickWeiter(wrapper)
    expect(wrapper.find('[data-testid="wz-score"]').text()).toBe('1 / 1')
    const p = await readProgress(ABRUF_V.id)
    expect(p.gatePasses).toBe(1)
  })

  it('skips the item with no outcome when grading fails', async () => {
    aiFlags.enabled = true
    generateContentMock.mockRejectedValue(new Error('grader down'))
    await db.wortschatzProgress.put(dueRow(ABRUF_V.id, 'anwendung', 1))
    const before = await readProgress(ABRUF_V.id)
    const wrapper = await mountRunner()

    await wrapper.find('textarea').setValue('Die Stadt muss endlich eine Maßnahme ergreifen.')
    await findButton(wrapper, 'Absenden')!.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('Bewertung fehlgeschlagen — Antwort zählt nicht')

    await clickWeiter(wrapper)
    expect(wrapper.find('[data-testid="wz-summary"]').exists()).toBe(true)
    // No outcome applied: the row is untouched and the run counts no answer.
    const after = await readProgress(ABRUF_V.id)
    expect(after.updatedAt).toBe(before.updatedAt)
    expect(after.fsrs.due).toBe(before.fsrs.due)
    // Nothing was actually answered, so the sitting is practice, not a Run.
    expect(loadHistory().filter(r => r.type === 'wortschatz-wiederholen')).toHaveLength(0)
  })
})
