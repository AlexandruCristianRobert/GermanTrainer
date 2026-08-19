import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

// vi.hoisted() is required here (not just top-level const): both spies are
// referenced directly in the outer vi.mock factories below, which run during
// import-graph evaluation — before ordinary top-level statements in this file
// execute. An un-hoisted const throws "Cannot access ... before
// initialization"; vi.hoisted() hoists the declaration itself alongside the
// vi.mock calls so it is already initialized by the time they run.
const { recordDrillResult, saveQuizRun, drillQueue } = vi.hoisted(() => ({
  recordDrillResult: vi.fn(async () => undefined),
  saveQuizRun: vi.fn(),
  drillQueue: vi.fn(async () => ([
    {
      id: 'c1', discussionId: 'd1', topicTitle: 'Tempolimit', modality: 'typed',
      kind: 'grammar', quote: 'wegen dem Vertrag', suggested: 'wegen des Vertrags',
      reasonDe: '„wegen" verlangt den Genitiv.', reasonEn: 'genitive',
      context: 'Ich konnte nicht kündigen, wegen dem Vertrag mit der Firma.',
      createdAt: 1000,
      schedule: { status: 'offen', streak: 0, lastCorrectAt: null, dueAt: null }
    },
    {
      id: 'c2', discussionId: 'd1', topicTitle: 'Tempolimit', modality: 'typed',
      kind: 'register', quote: 'da hast du recht', suggested: 'da haben Sie recht',
      reasonDe: 'In der Prüfung wird gesiezt.', reasonEn: 'formal register',
      context: 'Naja, da hast du recht.', createdAt: 2000,
      schedule: { status: 'offen', streak: 0, lastCorrectAt: null, dueAt: null }
    }
  ]))
}))

vi.mock('../../src/composables/useSprechenArchive', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  drillQueue,
  recordDrillResult
}))
vi.mock('../../src/composables/useQuizHistory', () => ({ saveQuizRun }))

import SprechenDrill from '../../src/modules/sprechen/SprechenDrill.vue'

beforeEach(() => {
  recordDrillResult.mockClear()
  saveQuizRun.mockClear()
  drillQueue.mockClear()
  push.mockClear()
})

async function mountDrill() {
  const w = mount(SprechenDrill)
  await flushPromises()
  return w
}

describe('SprechenDrill', () => {
  it('shows the learner\'s own sentence with the wrong span marked', async () => {
    const w = await mountDrill()
    expect(w.find('.spr-remed-ctx').text()).toContain('Ich konnte nicht kündigen')
    expect(w.find('.spr-remed-ctx .hit').text()).toBe('wegen dem Vertrag')
  })

  it('accepts the exact suggestion', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('wegen des Vertrags')
    await w.find('.btn-accent').trigger('click')
    expect(w.text()).toContain('Richtig')
    expect(recordDrillResult).toHaveBeenCalledWith('c1', true)
  })

  it('folds umlauts and ignores case and punctuation', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('  WEGEN DES VERTRAGS.  ')
    await w.find('.btn-accent').trigger('click')
    expect(recordDrillResult).toHaveBeenCalledWith('c1', true)
  })

  it('marks a wrong answer wrong, shows the reason, and keeps it open', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('wegen dem Vertrag')
    await w.find('.btn-accent').trigger('click')
    expect(w.text()).toContain('wegen des Vertrags')
    expect(w.text()).toContain('verlangt den Genitiv')
    expect(recordDrillResult).toHaveBeenCalledWith('c1', false)
  })

  it('advances to the next correction', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('wegen des Vertrags')
    await w.find('.btn-accent').trigger('click')
    await w.find('.drill-advance').trigger('click')
    expect(w.find('.spr-remed-ctx').text()).toContain('da hast du recht')
  })

  it('saves one Run for the session with first-try correct count', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('wegen des Vertrags')
    await w.find('.btn-accent').trigger('click')
    await w.find('.drill-advance').trigger('click')
    await w.find('.spr-remed-in').setValue('falsch')
    await w.find('.btn-accent').trigger('click')
    await w.find('.drill-advance').trigger('click')
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const run = saveQuizRun.mock.calls[0][0]
    expect(run.type).toBe('sprechen-drill')
    expect(run.count).toBe(2)
    expect(run.correct).toBe(1)
  })

  it('Enter grades the answer, and Enter again presses Weiter', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').setValue('wegen des Vertrags')
    await w.find('.spr-remed-in').trigger('keydown.enter')
    await flushPromises()
    expect(w.text()).toContain('Richtig')
    // The input is readonly (not disabled) after grading, so Enter still lands there.
    await w.find('.spr-remed-in').trigger('keydown.enter')
    expect(w.find('.spr-remed-ctx').text()).toContain('da hast du recht')
  })

  it('Enter with an empty answer grades nothing', async () => {
    const w = await mountDrill()
    await w.find('.spr-remed-in').trigger('keydown.enter')
    expect(recordDrillResult).not.toHaveBeenCalled()
    expect(w.find('.drill-feedback').exists()).toBe(false)
  })

  it('focuses the input on load, the Weiter button after grading, the input again on the next correction', async () => {
    const w = mount(SprechenDrill, { attachTo: document.body })
    await flushPromises()
    await nextTick()
    expect(document.activeElement).toBe(w.find('.spr-remed-in').element)
    await w.find('.spr-remed-in').setValue('wegen des Vertrags')
    await w.find('.spr-remed-in').trigger('keydown.enter')
    await flushPromises()
    await nextTick()
    // Focus moves to the Weiter button, so plain Enter activates it natively too.
    expect(document.activeElement).toBe(w.find('button.drill-advance').element)
    await w.find('button.drill-advance').trigger('click')
    await nextTick()
    expect(document.activeElement).toBe(w.find('.spr-remed-in').element)
    w.unmount()
  })

  it('shows an empty state when nothing is open or fällig', async () => {
    drillQueue.mockResolvedValueOnce([])
    const w = await mountDrill()
    expect(w.find('.alert-label').text()).toBe('Nichts offen oder fällig')
    expect(w.text()).toContain('Es gibt gerade keine offenen oder fälligen Korrekturen')
    expect(w.text()).toContain('nach 3, 10 und 30 Tagen wieder')
    expect(w.find('.spr-remed-in').exists()).toBe(false)
  })

  it('calls drillQueue with a 20-item cap to build the queue', async () => {
    await mountDrill()
    expect(drillQueue).toHaveBeenCalledWith(20)
  })

  it('badges a fällige item with its next repetition number', async () => {
    drillQueue.mockResolvedValueOnce([
      {
        id: 'c3', discussionId: 'd1', topicTitle: 'Tempolimit', modality: 'typed',
        kind: 'grammar', quote: 'wegen dem Vertrag', suggested: 'wegen des Vertrags',
        reasonDe: '„wegen" verlangt den Genitiv.', reasonEn: 'genitive',
        context: 'Ich konnte nicht kündigen, wegen dem Vertrag mit der Firma.',
        createdAt: 1000,
        schedule: { status: 'faellig', streak: 1, lastCorrectAt: 500, dueAt: 900 }
      }
    ])
    const w = await mountDrill()
    expect(w.find('.micro-mark .wv-badge').text()).toBe('fällig · 2. Wiederholung')
  })

  it('renders no fällig badge for an offen item', async () => {
    const w = await mountDrill()
    expect(w.find('.micro-mark').text()).not.toContain('fällig')
    expect(w.find('.wv-badge').exists()).toBe(false)
  })
})
