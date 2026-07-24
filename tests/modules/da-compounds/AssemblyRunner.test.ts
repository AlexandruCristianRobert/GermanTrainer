import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AssemblyRunner from '../../../src/modules/da-compounds/AssemblyRunner.vue'

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (same technique as
// DialogueRunner.test.ts), so tests can know exactly which item a
// `count`+filter combination will draw. The per-card TILE shuffle inside
// useDaAssemblyQuiz is untouched — tests locate tiles by their stable
// `data-tile-index` attribute instead of relying on pool order.
vi.mock('../../../src/composables/useDaAssemblyQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDaAssemblyQuiz')>()
  return {
    ...actual,
    sampleAssemblyItems: vi.fn((count: number, f: Parameters<typeof actual.filterAssemblyItems>[0] = {}) =>
      actual.filterAssemblyItems(f).slice(0, count)),
  }
})
import { sampleAssemblyItems, filterAssemblyItems } from '../../../src/composables/useDaAssemblyQuiz'
import { assemblySentence } from '../../../src/data/daAssembly'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/da-compounds/assembly/run', name: 'dacompounds-assembly-run', component: { template: '<div />' } },
      { path: '/da-compounds/assembly', name: 'dacompounds-assembly', component: { template: '<div />' } },
      { path: '/da-compounds', name: 'dacompounds', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'dacompounds-assembly-run', query })
  const wrapper = mount(AssemblyRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

function poolTiles(wrapper: VueWrapper) {
  return wrapper.findAll('.asm-pool .asm-tile')
}

function placedTiles(wrapper: VueWrapper) {
  return wrapper.findAll('.asm-assembled .asm-tile')
}

async function tapTile(wrapper: VueWrapper, tileIndex: number) {
  const btn = wrapper.find(`.asm-pool [data-tile-index="${tileIndex}"]`)
  await btn.trigger('click')
}

async function placeInOrder(wrapper: VueWrapper, order: number[]) {
  for (const idx of order) await tapTile(wrapper, idx)
}

async function submit(wrapper: VueWrapper) {
  const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
  await submitBtn!.trigger('click')
}

// The first item drawn with no filters — the dataset's opening entry.
const FIRST = filterAssemblyItems({})[0]

describe('AssemblyRunner — smoke tests', () => {
  beforeEach(() => { vi.mocked(sampleAssemblyItems).mockClear() })

  it('renders the quiz stage', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(wrapper.find('.asm-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders one pool tile per item tile and an empty assembled sequence', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    expect(poolTiles(wrapper)).toHaveLength(FIRST.item.tiles.length)
    expect(placedTiles(wrapper)).toHaveLength(0)
    wrapper.unmount()
  })

  it('tapping a pool tile places it into the assembled sequence, in tap order', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    await tapTile(wrapper, 1)
    await tapTile(wrapper, 0)
    const placed = placedTiles(wrapper)
    expect(placed).toHaveLength(2)
    expect(placed[0].text()).toBe(FIRST.item.tiles[1])
    expect(placed[1].text()).toBe(FIRST.item.tiles[0])
    expect(poolTiles(wrapper)).toHaveLength(FIRST.item.tiles.length - 2)
    wrapper.unmount()
  })

  it('tapping a placed tile returns it to the pool', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    await tapTile(wrapper, 0)
    expect(placedTiles(wrapper)).toHaveLength(1)
    await placedTiles(wrapper)[0].trigger('click')
    expect(placedTiles(wrapper)).toHaveLength(0)
    expect(poolTiles(wrapper)).toHaveLength(FIRST.item.tiles.length)
    wrapper.unmount()
  })

  it('disables Submit until every tile is placed', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(true)

    const n = FIRST.item.tiles.length
    for (let i = 0; i < n - 1; i++) await tapTile(wrapper, i)
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(true)

    await tapTile(wrapper, n - 1)
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(false)
    wrapper.unmount()
  })

  it('reveals ✓ feedback and the canonical sentence for a canonical-order submission', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const canonicalOrder = FIRST.item.tiles.map((_, i) => i)
    await placeInOrder(wrapper, canonicalOrder)
    await submit(wrapper)
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    expect(wrapper.find('.asm-canonical').text()).toBe(assemblySentence(FIRST.item))
    expect(wrapper.find('.asm-also-correct').exists()).toBe(false)
    expect(wrapper.find('.sub-reveal-explanation').exists()).toBe(false)
    wrapper.unmount()
  })

  it('reveals ✓ feedback and an "auch richtig" note for a curated variant submission', async () => {
    expect(FIRST.item.variants?.length).toBeGreaterThan(0)
    const variant = FIRST.item.variants![0]
    const { wrapper } = await mountRunner({ count: '1' })
    await placeInOrder(wrapper, variant)
    await submit(wrapper)
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    expect(wrapper.find('.asm-canonical').text()).toBe(assemblySentence(FIRST.item))
    const note = wrapper.find('.asm-also-correct')
    expect(note.exists()).toBe(true)
    expect(note.text()).toContain('auch richtig')
    expect(note.text()).toContain(assemblySentence(FIRST.item, variant))
    wrapper.unmount()
  })

  it('reveals ✗ feedback, the canonical sentence, and the coreIdeaExplanation for a wrong order', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    const reversed = FIRST.item.tiles.map((_, i) => i).reverse()
    await placeInOrder(wrapper, reversed)
    await submit(wrapper)
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    expect(wrapper.find('.asm-canonical').text()).toBe(assemblySentence(FIRST.item))
    expect(wrapper.find('.sub-reveal-explanation').text()).toBe(FIRST.colloc.coreIdeaExplanation)
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'C1', preps: 'bei' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('AssemblyRunner — history recording (offline family: once-only, retry never)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const reversed = FIRST.item.tiles.map((_, i) => i).reverse()
    await placeInOrder(wrapper, reversed)
    await submit(wrapper)
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type and meta', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'B1' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dac-assembly',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: ['B1'] }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ count: '1' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not record an empty/never-started run', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'C1', preps: 'bei' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
