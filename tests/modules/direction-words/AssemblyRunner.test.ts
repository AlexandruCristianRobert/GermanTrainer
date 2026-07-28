import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AssemblyRunner from '../../../src/modules/direction-words/AssemblyRunner.vue'
import { dwAssemblySentence } from '../../../src/data/directionAssembly'

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// Deterministic sampling: slice instead of shuffle (same technique as
// da-compounds/AssemblyRunner.test.ts). useDirectionAssemblyQuiz.ts's pool is
// built once at module-load time with createPool's default `rng = Math.random`
// captured then — a later `vi.spyOn(Math, 'random')` cannot retroactively
// change that already-closed-over reference, so item SELECTION can't be
// pinned via Math.random alone. Replacing sampleDwAssemblyItems sidesteps
// that entirely and guarantees which item a `count`+`levels` combination
// draws. The per-card TILE shuffle inside useDwAssemblyQuiz (dealPool) is a
// fresh call with its own default `rng = Math.random`, evaluated at drill-
// mount time (after the spy below is installed), so pinning Math.random to 0
// still makes it deal tiles in canonical order — tests locate tiles by their
// stable `data-tile-index` attribute regardless, so this is a belt-and-braces
// determinism guard, not a requirement.
vi.mock('../../../src/composables/useDirectionAssemblyQuiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/useDirectionAssemblyQuiz')>()
  return {
    ...actual,
    sampleDwAssemblyItems: vi.fn((count: number, f: Parameters<typeof actual.filterDwAssemblyItems>[0] = {}) =>
      actual.filterDwAssemblyItems(f).slice(0, count)),
  }
})
import { sampleDwAssemblyItems, filterDwAssemblyItems } from '../../../src/composables/useDirectionAssemblyQuiz'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/direction-words/assembly/run', name: 'directionwords-assembly-run', component: { template: '<div />' } },
      { path: '/direction-words/assembly', name: 'directionwords-assembly', component: { template: '<div />' } },
      { path: '/direction-words', name: 'directionwords', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'directionwords-assembly-run', query })
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

// The first item drawn with every level selected — the dataset's opening
// entry ('dwa-treppe-hinunter', A2, no variants).
const FIRST = filterDwAssemblyItems({})[0]!
const QUERY = { count: '1', levels: 'A2,B1,B2,C1' }

describe('AssemblyRunner — tile drill', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.mocked(sampleDwAssemblyItems).mockClear()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => randomSpy.mockRestore())

  it('renders the quiz stage with one pool tile per item tile, as buttons, and an empty assembled sequence', async () => {
    const { wrapper } = await mountRunner(QUERY)
    expect(wrapper.find('.asm-stage').exists()).toBe(true)
    const tiles = poolTiles(wrapper)
    expect(tiles).toHaveLength(FIRST.tiles.length)
    tiles.forEach(t => expect(t.element.tagName).toBe('BUTTON'))
    expect(placedTiles(wrapper)).toHaveLength(0)
    wrapper.unmount()
  })

  it('tapping a pool tile places it, tapping a placed tile returns it to the pool (round-trip)', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await tapTile(wrapper, 1)
    await tapTile(wrapper, 0)
    let placed = placedTiles(wrapper)
    expect(placed).toHaveLength(2)
    expect(placed[0].text()).toBe(FIRST.tiles[1])
    expect(placed[1].text()).toBe(FIRST.tiles[0])
    expect(poolTiles(wrapper)).toHaveLength(FIRST.tiles.length - 2)

    // Unplace the first placed tile — it must return to the pool intact.
    await placed[0].trigger('click')
    placed = placedTiles(wrapper)
    expect(placed).toHaveLength(1)
    expect(placed[0].text()).toBe(FIRST.tiles[0])
    expect(poolTiles(wrapper)).toHaveLength(FIRST.tiles.length - 1)
    wrapper.unmount()
  })

  it('disables Submit until every tile is placed, then enables it', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(true)

    const n = FIRST.tiles.length
    for (let i = 0; i < n - 1; i++) await tapTile(wrapper, i)
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(true)

    await tapTile(wrapper, n - 1)
    expect((submitBtn!.element as HTMLButtonElement).disabled).toBe(false)
    wrapper.unmount()
  })

  it('a deliberately wrong full order grades wrong and offers a retry (not recorded — see history describe below)', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const reversed = FIRST.tiles.map((_, i) => i).reverse()
    await placeInOrder(wrapper, reversed)
    await submit(wrapper)
    expect(wrapper.find('.sub-feedback-bad').exists()).toBe(true)
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(false)
    expect(wrapper.find('.asm-canonical').text()).toBe(dwAssemblySentence(FIRST))

    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    expect(retryBtn).toBeTruthy()
    wrapper.unmount()
  })

  it('assembling the canonical order grades correct and reveals the rendered sentence + translation', async () => {
    const { wrapper } = await mountRunner(QUERY)
    const canonicalOrder = FIRST.tiles.map((_, i) => i)
    await placeInOrder(wrapper, canonicalOrder)
    await submit(wrapper)
    expect(wrapper.find('.sub-feedback-ok').exists()).toBe(true)
    expect(wrapper.find('.asm-canonical').text()).toBe(dwAssemblySentence(FIRST))
    expect(wrapper.text()).toContain(FIRST.translation)
    expect(wrapper.find('.asm-also-correct').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows an error state when no items match the filters', async () => {
    // The assembly bank has no C1-level items (A2/B1/B2 only), so this level
    // filter is guaranteed to match nothing.
    expect(filterDwAssemblyItems({ levels: ['C1'] })).toHaveLength(0)
    const { wrapper } = await mountRunner({ count: '1', levels: 'C1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('AssemblyRunner — history recording (offline family: once-only, retry never, empty never)', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => randomSpy.mockRestore())

  async function completeOneCardWrong(wrapper: VueWrapper) {
    const reversed = FIRST.tiles.map((_, i) => i).reverse()
    await placeInOrder(wrapper, reversed)
    await submit(wrapper)
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes, with the right type', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dw-assembly',
      count: 1,
      correct: 0,
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner(QUERY)
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not record an empty/never-started run', async () => {
    const { wrapper } = await mountRunner({ count: '1', levels: 'C1' })
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
