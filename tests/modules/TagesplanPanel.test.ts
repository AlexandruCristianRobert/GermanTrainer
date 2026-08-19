import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../src/composables/useTagesplan', () => ({
  buildTagesplan: vi.fn(async () => [])
}))

vi.mock('../../src/composables/useQuizHistory', () => ({
  loadHistory: vi.fn(() => [])
}))

import TagesplanPanel from '../../src/modules/home/TagesplanPanel.vue'
import { buildTagesplan } from '../../src/composables/useTagesplan'
import { loadHistory } from '../../src/composables/useQuizHistory'
import type { TagesplanRow } from '../../src/composables/useTagesplan'

const push = vi.fn()
const stubs = { RouterLink: true }
const global = { stubs, mocks: { $router: { push } } }

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

beforeEach(() => {
  push.mockClear()
  vi.mocked(buildTagesplan).mockReset()
  vi.mocked(loadHistory).mockReset()
  vi.mocked(loadHistory).mockReturnValue([])
})

/** Minimal but complete TagesplanRow fixture — only `id`/`route` vary between
 *  callers, every other field is filler that satisfies the type. */
function makeRow(id: string): TagesplanRow {
  return { id, title: `Title ${id}`, detail: `Detail ${id}`, route: `route-${id}`, count: 3 }
}

describe('TagesplanPanel', () => {
  it('renders nothing when buildTagesplan resolves an empty array', async () => {
    vi.mocked(buildTagesplan).mockResolvedValueOnce([])
    const w = mount(TagesplanPanel, { global })
    await flushPromises()
    expect(w.find('.tagesplan').exists()).toBe(false)
  })

  it('renders two rows with title, detail, and a count badge', async () => {
    const rows = [makeRow('a'), makeRow('b')]
    vi.mocked(buildTagesplan).mockResolvedValueOnce(rows)
    const w = mount(TagesplanPanel, { global })
    await flushPromises()
    expect(w.find('.tagesplan').exists()).toBe(true)
    const items = w.findAll('.tp-row')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Title a')
    expect(items[0].text()).toContain('Detail a')
    expect(items[0].find('.tp-badge').text()).toBe('3')
    expect(items[1].text()).toContain('Title b')
    expect(items[1].text()).toContain('Detail b')
    expect(items[1].find('.tp-badge').text()).toBe('3')
  })

  it('clicking a row pushes its route name', async () => {
    const rows = [makeRow('a'), makeRow('b')]
    vi.mocked(buildTagesplan).mockResolvedValueOnce(rows)
    const w = mount(TagesplanPanel, { global })
    await flushPromises()
    await w.findAll('.tp-row')[1].trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'route-b' })
  })

  it('renders nothing when buildTagesplan rejects (fail-soft)', async () => {
    vi.mocked(buildTagesplan).mockRejectedValueOnce(new Error('archive down'))
    const w = mount(TagesplanPanel, { global })
    await flushPromises()
    expect(w.find('.tagesplan').exists()).toBe(false)
  })

  it('HARD REQUIREMENT (Task 1 gate): calls buildTagesplan with exactly the array loadHistory() returns — never [] or a slice', async () => {
    // Regression guard: a truncated window on the first-ever call permanently
    // under-seeds the lifetime rollup gt:drillTotals (see useTagesplan.ts
    // header comment). The panel must forward loadHistory()'s result as-is.
    const sentinel = [{ id: 999 }] as unknown as ReturnType<typeof loadHistory>
    vi.mocked(loadHistory).mockReturnValue(sentinel)
    vi.mocked(buildTagesplan).mockResolvedValueOnce([])
    mount(TagesplanPanel, { global })
    await flushPromises()
    expect(buildTagesplan).toHaveBeenCalledTimes(1)
    expect(buildTagesplan).toHaveBeenCalledWith(sentinel)
  })
})
