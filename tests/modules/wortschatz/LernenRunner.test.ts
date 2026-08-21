// Task 10 — LernenRunner (Lernsitzung) mount test. Real Dexie (fake-indexeddb),
// real router, real scheduler: the only thing engineered here is the *size* of
// the unseen pool — 18 of the 20 Umwelt Vokabeln get a progress row up front,
// so buildLernAuswahl's sampling is bypassed (a 2-item unseen pool is returned
// whole) and the session is deterministically 2 items long without mocking the
// queue builder.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import LernenRunner from '../../../src/modules/wortschatz/LernenRunner.vue'
import { db } from '../../../src/db'
import { WORTSCHATZ_VOKABELN, type Vokabel } from '../../../src/data/wortschatz'
import { newProgress } from '../../../src/composables/wortschatzScheduler'
import { readAllProgress, saveProgress } from '../../../src/composables/useWortschatzProgress'
import { loadHistory, clearHistory } from '../../../src/composables/useQuizHistory'

const UMWELT: Vokabel[] = WORTSCHATZ_VOKABELN.filter(v => v.feld === 'Umwelt')

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/wortschatz', name: 'wortschatz', component: { template: '<div />' } },
      { path: '/wortschatz/lernen/run', name: 'wortschatz-lernen-run', component: { template: '<div />' } },
    ],
  })
}

/** The Dexie/fake-indexeddb round trip behind the runner's mount chains several
 *  levels deep (vokabelnByFeld → allVokabeln → toArray, readAllProgress → …),
 *  more than one flushPromises() drains (see WortschatzHome.test.ts). */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await flushPromises()
}

async function mountRunner(query: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'wortschatz-lernen-run', query })
  const wrapper = mount(LernenRunner, { attachTo: document.body, global: { plugins: [router] } })
  await settle()
  return { wrapper, router }
}

function button(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find(b => b.text().startsWith(text))
}

async function click(wrapper: VueWrapper, text: string): Promise<void> {
  const btn = button(wrapper, text)
  if (!btn) throw new Error(`no button starting with „${text}" — saw: ${wrapper.findAll('button').map(b => b.text()).join(' | ')}`)
  await btn.trigger('click')
  await settle()
}

/** Answers the shown ErkennenCard correctly: the stage's headline is the
 *  Vokabel's German form, which identifies which of the two items is up and
 *  therefore which English option is the right one. */
async function answerErkennenCorrectly(wrapper: VueWrapper, unseen: Vokabel[]): Promise<void> {
  const shownDe = wrapper.find('.drill-sentence').text()
  const v = unseen.find(item => item.de === shownDe)
  if (!v) throw new Error(`Erkennen card shows an unexpected Vokabel: „${shownDe}"`)
  const choice = wrapper.findAll('.choice').find(c => c.text() === v.en)
  if (!choice) throw new Error(`no option for „${v.en}"`)
  await choice.trigger('click')
  await settle()
  await click(wrapper, 'Weiter')
}

/** Pre-writes progress rows for every Umwelt Vokabel except the last `keep`,
 *  so exactly those stay unseen. Returns the unseen ones. */
async function seedAllButLast(keep: number): Promise<Vokabel[]> {
  const seen = UMWELT.slice(0, UMWELT.length - keep)
  const now = Date.now() - 60_000
  for (const v of seen) await saveProgress(newProgress(v.id, now))
  return UMWELT.slice(UMWELT.length - keep)
}

beforeEach(async () => {
  await db.wortschatzProgress.clear()
  await db.wortschatzCustom.clear()
  clearHistory()
})

describe('LernenRunner — Lernsitzung', () => {
  it('runs intro → two Erkennen rounds → summary, records the Run and promotes both Vokabeln to Lücke', async () => {
    const unseen = await seedAllButLast(2)
    expect(unseen).toHaveLength(2)

    const { wrapper } = await mountRunner({ feld: 'Umwelt' })

    // Step header spans both phases: 2 intros + 2 items × 2 Erkennen rounds.
    expect(wrapper.text()).toContain('Schritt 1 / 6')
    // Intro phase opens on one of the two unseen items (order is shuffled).
    expect(unseen.some(v => wrapper.text().includes(v.en))).toBe(true)
    expect(button(wrapper, 'Aufdecken')).toBeTruthy()

    // Intro phase — each card reveals, then advances on its own „Weiter".
    for (let i = 0; i < 2; i++) {
      await click(wrapper, 'Aufdecken')
      await click(wrapper, 'Weiter')
    }

    // Erkennen phase — 4 clean answers (2 items × 2 rounds).
    expect(wrapper.findAll('.choice')).toHaveLength(4)
    for (let i = 0; i < 4; i++) {
      await answerErkennenCorrectly(wrapper, unseen)
    }

    expect(wrapper.find('[data-testid="wz-summary"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('4 / 4 richtig')
    expect(button(wrapper, 'Nochmal')).toBeTruthy()

    const run = loadHistory().find(e => e.type === 'wortschatz-lernen')
    expect(run).toBeTruthy()
    expect(run!.count).toBe(2)
    expect(run!.correct).toBe(2)
    expect(run!.meta.wortschatzFeld).toBe('Umwelt')
    expect(typeof run!.startedAt).toBe('string')
    expect(run!.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const progress = await readAllProgress()
    for (const v of unseen) {
      expect(progress.get(v.id)?.stufe).toBe('luecke')
    }

    wrapper.unmount()
  })

  it('re-queues a missed Vokabel once inside its round and counts it as not clean', async () => {
    const [v] = await seedAllButLast(1)
    const { wrapper } = await mountRunner({ feld: 'Umwelt' })

    // 1 item: 1 intro + 2 Erkennen rounds = 3 steps before any miss.
    expect(wrapper.text()).toContain('Schritt 1 / 3')
    await click(wrapper, 'Aufdecken')
    await click(wrapper, 'Weiter')

    // Round 1, answered wrong → the item comes back at the end of the round,
    // so the step total grows by exactly one.
    const wrong = wrapper.findAll('.choice').find(c => c.text() !== v.en)!
    await wrong.trigger('click')
    await settle()
    await click(wrapper, 'Weiter')
    expect(wrapper.text()).toContain('Schritt 3 / 4')
    expect(wrapper.find('.drill-sentence').text()).toBe(v.de)

    // The re-queued rep, then round 2 — both clean, but the miss stands.
    await answerErkennenCorrectly(wrapper, [v])
    await answerErkennenCorrectly(wrapper, [v])

    expect(wrapper.find('[data-testid="wz-summary"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('2 / 3 richtig')
    expect(wrapper.find('[data-testid="wz-bilanz-row"]').text()).toContain('✗ 1')

    const run = loadHistory().find(e => e.type === 'wortschatz-lernen')!
    expect(run.count).toBe(1)
    expect(run.correct).toBe(0)

    // Two clean Erkennen passes still landed, so the Stufe advanced anyway.
    expect((await readAllProgress()).get(v.id)?.stufe).toBe('luecke')

    wrapper.unmount()
  })

  it('sends an invalid feld back to the hub', async () => {
    const { wrapper, router } = await mountRunner({ feld: 'Quatsch' })
    expect(router.currentRoute.value.name).toBe('wortschatz')
    wrapper.unmount()
  })

  it('shows the „Alles eingeführt" state when the Themenfeld has no unseen Vokabeln', async () => {
    await seedAllButLast(0)
    const { wrapper } = await mountRunner({ feld: 'Umwelt' })
    expect(wrapper.find('[data-testid="wz-leer"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Alles eingeführt')
    wrapper.unmount()
  })
})
