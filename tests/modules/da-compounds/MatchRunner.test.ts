import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import MatchRunner from '../../../src/modules/da-compounds/MatchRunner.vue'
import { daCompound } from '../../../src/data/daCompounds'

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/match/run', name: 'dacompounds-match-run', component: { template: '<div />' } },
      { path: '/da-compounds/match', name: 'dacompounds-match', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-match-run', query })
  const wrapper = mount(MatchRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

function findSubmitBtn(wrapper: VueWrapper) {
  return wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
}
function findNextBtn(wrapper: VueWrapper) {
  return wrapper.findAll('button').find(b => b.text().startsWith('Next') || b.text().startsWith('Finish'))
}

describe('MatchRunner — smoke tests (count=1, trivially a single correct pair)', () => {
  it('renders the stage with one row and one pool chip', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.match-stage').exists()).toBe(true)
    expect(wrapper.findAll('.match-row')).toHaveLength(1)
    expect(wrapper.findAll('.match-chip.pool')).toHaveLength(1)
    wrapper.unmount()
  })

  it('tapping the row then the chip assigns the pair and the chip leaves the pool', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const row = wrapper.find('.match-row')
    await row.trigger('click')
    expect(row.classes()).toContain('selected')
    await wrapper.find('.match-chip.pool').trigger('click')
    expect(wrapper.find('.match-chip.placed').exists()).toBe(true)
    expect(wrapper.findAll('.match-chip.pool')).toHaveLength(0)
    wrapper.unmount()
  })

  it('tapping an assigned row unassigns it, returning the chip to the pool', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    await wrapper.find('.match-row').trigger('click')
    await wrapper.find('.match-chip.pool').trigger('click')
    await wrapper.find('.match-row').trigger('click') // now assigned -> tapping unassigns
    expect(wrapper.find('.match-chip.placed').exists()).toBe(false)
    expect(wrapper.findAll('.match-chip.pool')).toHaveLength(1)
    wrapper.unmount()
  })

  it('Submit is disabled until the row is assigned, then grades correctly on click', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const submitBtn = findSubmitBtn(wrapper)!
    expect(submitBtn.attributes('disabled')).toBeDefined()
    await wrapper.find('.match-row').trigger('click')
    await wrapper.find('.match-chip.pool').trigger('click')
    expect(findSubmitBtn(wrapper)!.attributes('disabled')).toBeUndefined()
    await findSubmitBtn(wrapper)!.trigger('click')
    expect(wrapper.find('.match-row.correct').exists()).toBe(true)
    expect(wrapper.find('.match-row.wrong').exists()).toBe(false)
    wrapper.unmount()
  })
})

// Every screen is packed with pairwise-distinct governing prepositions (engine
// invariant, see useDaMatchQuiz.test.ts). That guarantee — not any assumption about
// dataset content or ordering — is what makes the "steal the last row's compound"
// swap below deterministically wrong for both the first and the last row, on ANY
// screen with 2+ pairs, regardless of the real (unmocked) shuffle.
async function assignScreen(wrapper: VueWrapper, opts: { forceWrongOnMultiRow: boolean }) {
  const rows = wrapper.findAll('.match-row')
  const k = rows.length
  for (let i = 0; i < k; i++) {
    const prep = rows[i].attributes('data-prep')!
    let target: string
    if (opts.forceWrongOnMultiRow && k >= 2 && i === 0) {
      target = daCompound(rows[k - 1].attributes('data-prep')!) // steal the last row's compound
    } else if (opts.forceWrongOnMultiRow && k >= 2 && i === k - 1) {
      // whatever remains — deterministically row 0's original (stolen) compound
      await rows[i].trigger('click')
      const leftover = wrapper.findAll('.match-chip.pool')[0]
      await leftover.trigger('click')
      continue
    } else {
      target = daCompound(prep)
    }
    await rows[i].trigger('click')
    const chip = wrapper.findAll('.match-chip.pool').find(c => c.text() === target)!
    await chip.trigger('click')
  }
}

/** Drives the whole quiz to completion. Every multi-row screen gets its first/last
 *  row deliberately swapped (wrong); every single-row screen is necessarily correct
 *  (its one pool chip is, by construction, its own answer). Returns once the
 *  `.match-stage` is gone (either the retry modal or the result page is showing). */
async function driveWholeQuiz(wrapper: VueWrapper) {
  let guard = 0
  while (wrapper.find('.match-stage').exists()) {
    if (++guard > 200) throw new Error('runaway loop in driveWholeQuiz')
    await assignScreen(wrapper, { forceWrongOnMultiRow: true })
    await findSubmitBtn(wrapper)!.trigger('click')
    await findNextBtn(wrapper)!.trigger('click')
  }
}

describe('MatchRunner — grading, reveal, retry, history (dataset-agnostic swap)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  it('grades a deliberately-swapped pair as wrong and reveals the correct compound', async () => {
    // The whole an/auf pool guarantees (by pigeonhole) at least one screen with 2+ pairs.
    const { wrapper } = await mountRunner({ count: '9999', preps: 'an,auf' })
    let sawWrong = false
    let guard = 0
    while (wrapper.find('.match-stage').exists() && !sawWrong) {
      if (++guard > 200) throw new Error('runaway loop')
      await assignScreen(wrapper, { forceWrongOnMultiRow: true })
      await findSubmitBtn(wrapper)!.trigger('click')
      if (wrapper.find('.match-row.wrong').exists()) {
        sawWrong = true
        expect(wrapper.find('.match-reveal').exists()).toBe(true)
        break
      }
      await findNextBtn(wrapper)!.trigger('click')
    }
    expect(sawWrong).toBe(true)
    wrapper.unmount()
  })

  it('records exactly one Run on finish, with the right type/count/meta, and offers retry', async () => {
    const { wrapper } = await mountRunner({ count: '9999', preps: 'an,auf' })
    await driveWholeQuiz(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const call = vi.mocked(saveQuizRun).mock.calls[0][0]
    expect(call.type).toBe('dac-match')
    expect(call.count).toBeGreaterThan(0)
    expect(call.correct).toBeGreaterThanOrEqual(0)
    expect(call.correct).toBeLessThanOrEqual(call.count)
    expect(call.meta.preps).toEqual(expect.arrayContaining(['an', 'auf']))
    // The forced swap guarantees at least one wrong pair, so the retry modal should show.
    expect(wrapper.find('.retry-modal').exists()).toBe(true)
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '9999', preps: 'an,auf' })
    await driveWholeQuiz(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    // Retry round: assign arbitrarily (correctness irrelevant — it must not record).
    let guard = 0
    while (wrapper.find('.match-stage').exists()) {
      if (++guard > 200) throw new Error('runaway loop')
      await assignScreen(wrapper, { forceWrongOnMultiRow: false })
      await findSubmitBtn(wrapper)!.trigger('click')
      await findNextBtn(wrapper)!.trigger('click')
    }
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
