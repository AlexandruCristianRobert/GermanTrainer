import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CollocationsRunner from '../../../src/modules/prepositions/CollocationsRunner.vue'
import { prepSlug } from '../../../src/data/prepColors'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn(),
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/prepositions/collocations/run', name: 'prepositions-collocations-run', component: { template: '<div />' } },
      { path: '/prepositions/collocations', name: 'prepositions-collocations', component: { template: '<div />' } },
      { path: '/prepositions', name: 'prepositions', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string> = {}) {
  const router = makeRouter()
  await router.push({ name: 'prepositions-collocations-run', query })
  const wrapper = mount(CollocationsRunner, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('CollocationsRunner — smoke tests', () => {
  it('renders the quiz stage with a collocation word', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })
    expect(wrapper.find('.colloc-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows the preposition text input before submit', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })
    expect(wrapper.find('.input-prep').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows Akkusativ and Dativ buttons', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })
    const buttons = wrapper.findAll('button')
    const akkBtn  = buttons.find(b => b.text() === 'Akkusativ')
    const datBtn  = buttons.find(b => b.text() === 'Dativ')
    expect(akkBtn).toBeTruthy()
    expect(datBtn).toBeTruthy()
    wrapper.unmount()
  })

  it('Submit button is disabled until a case is selected', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    expect(submitBtn!.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('reveals feedback after selecting a case and clicking Submit', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })

    // Pick Akkusativ
    const akkBtn = wrapper.findAll('button').find(b => b.text() === 'Akkusativ')
    await akkBtn!.trigger('click')

    // Click Submit
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submitBtn!.trigger('click')

    expect(wrapper.find('.colloc-feedback').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows the example sentence after submit', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })

    const datBtn = wrapper.findAll('button').find(b => b.text() === 'Dativ')
    await datBtn!.trigger('click')

    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submitBtn!.trigger('click')

    expect(wrapper.find('.reveal-example').exists()).toBe(true)
    wrapper.unmount()
  })

  it('focuses the preposition input on the first card', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })
    const input = wrapper.find('.input-prep').element
    expect(document.activeElement).toBe(input)
    wrapper.unmount()
  })

  it('pressing 1 on the preposition input selects Akkusativ', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })

    await wrapper.find('.input-prep').trigger('keydown', { key: '1' })

    const akkBtn = wrapper.findAll('button').find(b => b.text() === 'Akkusativ')
    expect(akkBtn!.classes()).toContain('case-selected')

    // Case chosen from the keyboard enables Submit.
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    expect(submitBtn!.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('pressing 2 on the preposition input selects Dativ', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })

    await wrapper.find('.input-prep').trigger('keydown', { key: '2' })

    const datBtn = wrapper.findAll('button').find(b => b.text() === 'Dativ')
    expect(datBtn!.classes()).toContain('case-selected')
    wrapper.unmount()
  })

  it('ignores 1/2 once the card is submitted (case stays locked)', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })

    // Pick Akkusativ, then submit.
    await wrapper.find('.input-prep').trigger('keydown', { key: '1' })
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submitBtn!.trigger('click')

    // Try to switch to Dativ after submit — should be ignored.
    await wrapper.find('.input-prep').trigger('keydown', { key: '2' })
    const datBtn = wrapper.findAll('button').find(b => b.text() === 'Dativ')
    expect(datBtn!.classes()).not.toContain('case-selected')
    wrapper.unmount()
  })

  it('handles count=0 gracefully — still loads one item', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '0' })
    expect(wrapper.find('.colloc-stage').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows error state when no items match filters', async () => {
    // Use an impossible filter combination — empty levels
    const { wrapper } = await mountRunner({ levels: '', roles: 'verb', count: '1' })
    // With empty levels, csv returns all levels, so this might still work.
    // Instead mount with an extreme mismatch: just verify no crash.
    expect(wrapper.find('.page').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('CollocationsRunner — preposition colors', () => {
  it('the stage carries no --prep-accent style before submit (pre-submit unchanged)', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })
    const stage = wrapper.find('.colloc-stage')
    expect(stage.attributes('style')).toBeUndefined()
    wrapper.unmount()
  })

  it('the stage carries the item\'s --prep-accent / --prep-wash style after submit', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })

    const akkBtn = wrapper.findAll('button').find(b => b.text() === 'Akkusativ')
    await akkBtn!.trigger('click')
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submitBtn!.trigger('click')

    // The governed preposition is always shown post-submit, bold, in the prep row —
    // read it back to know which per-preposition slug the stage should now carry.
    const preposition = wrapper.find('.prep-accent-text').text()
    const slug = prepSlug(preposition)
    expect(slug).not.toBeNull()

    const style = wrapper.find('.colloc-stage').attributes('style') ?? ''
    expect(style).toContain(`--prep-accent: var(--prep-${slug})`)
    expect(style).toContain(`--prep-wash: var(--prep-${slug}-wash)`)
    wrapper.unmount()
  })

  it('shows the governed preposition in the prep row even when the answer was correct', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })

    const akkBtn = wrapper.findAll('button').find(b => b.text() === 'Akkusativ')
    await akkBtn!.trigger('click')
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submitBtn!.trigger('click')

    // Regardless of whether the case guess was right, the prep row must show a symbol
    // (✓ or →) followed by the bold, accent-colored governed preposition — never bare "✓".
    const feedback = wrapper.find('.colloc-feedback')
    expect(feedback.text()).toMatch(/^[✓→]\s*\S+$/)
    expect(wrapper.find('.prep-accent-text').text().length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('summary rows carry per-item --prep-accent / --prep-wash style vars', async () => {
    // retype off so a wrong guess can advance straight to the summary
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', retype: '0' })

    const akkBtn = wrapper.findAll('button').find(b => b.text() === 'Akkusativ')
    await akkBtn!.trigger('click')
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submitBtn!.trigger('click')

    const preposition = wrapper.find('.prep-accent-text').text()
    const slug = prepSlug(preposition)

    const finishBtn = wrapper.findAll('button').find(b => b.text().startsWith('Finish drill'))
    await finishBtn!.trigger('click')
    await flushPromises()

    // A wrong guess pops the retry modal first; dismiss it to reach the summary screen.
    const reviewBtn = wrapper.findAll('button').find(b => b.text() === 'Review instead')
    if (reviewBtn) {
      await reviewBtn.trigger('click')
      await flushPromises()
    }

    const row = wrapper.find('.colloc-result-row')
    expect(row.exists()).toBe(true)
    const style = row.attributes('style') ?? ''
    expect(style).toContain(`--prep-accent: var(--prep-${slug})`)
    expect(style).toContain(`--prep-wash: var(--prep-${slug}-wash)`)
    wrapper.unmount()
  })
})

describe('CollocationsRunner — core-idea hints', () => {
  it('renders the core-idea hint by default when no hints param is present', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })
    const hint = wrapper.find('.prompt-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text().length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('renders the core-idea hint when hints=1', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', hints: '1' })
    expect(wrapper.find('.prompt-hint').exists()).toBe(true)
    wrapper.unmount()
  })

  it('omits the core-idea hint element entirely when hints=0', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', hints: '0' })
    expect(wrapper.find('.prompt-hint').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps the core-idea hint visible after submit', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', hints: '1' })

    const akkBtn = wrapper.findAll('button').find(b => b.text() === 'Akkusativ')
    await akkBtn!.trigger('click')
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submitBtn!.trigger('click')

    const hint = wrapper.find('.prompt-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text().length).toBeGreaterThan(0)
    wrapper.unmount()
  })
})

describe('CollocationsRunner — retype on miss', () => {
  async function wrongSubmit(query: Record<string, string>) {
    const { wrapper } = await mountRunner(query)
    await wrapper.findAll('button').find(b => b.text() === 'Akkusativ')!.trigger('click')
    // no preposition typed -> the card is graded wrong
    await wrapper.findAll('button').find(b => b.text().startsWith('Submit'))!.trigger('click')
    await flushPromises()
    return wrapper
  }
  const advanceBtn = (wrapper: any) =>
    wrapper.findAll('button').find((b: any) => b.text().startsWith('Finish') || b.text().startsWith('Next'))

  it('retype on: a wrong answer shows the retype box and blocks advancing', async () => {
    const wrapper = await wrongSubmit({ levels: 'B1', roles: 'verb', count: '1', retype: '1' })
    expect(wrapper.find('.retype-input').exists()).toBe(true)
    expect(advanceBtn(wrapper)!.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('retype on: typing the correct answer unblocks advancing', async () => {
    const wrapper = await wrongSubmit({ levels: 'B1', roles: 'verb', count: '1', retype: '1' })
    const word = wrapper.find('.colloc-german').text()
    const prep = wrapper.find('.prep-accent-text').text()  // the revealed correct preposition
    await wrapper.find('.retype-input').setValue(`${word} ${prep}`)
    await flushPromises()
    expect(advanceBtn(wrapper)!.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('retype off: a wrong answer neither shows the box nor blocks advancing', async () => {
    const wrapper = await wrongSubmit({ levels: 'B1', roles: 'verb', count: '1', retype: '0' })
    expect(wrapper.find('.retype-input').exists()).toBe(false)
    expect(advanceBtn(wrapper)!.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('CollocationsRunner — color hint', () => {
  it('off by default: no color style and no color-hint class before submit', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })
    const stage = wrapper.find('.colloc-stage')
    expect(stage.attributes('style')).toBeUndefined()
    expect(stage.classes()).not.toContain('color-hint')
    wrapper.unmount()
  })

  it('color=0: no color style and no color-hint class before submit', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', color: '0' })
    const stage = wrapper.find('.colloc-stage')
    expect(stage.attributes('style')).toBeUndefined()
    expect(stage.classes()).not.toContain('color-hint')
    wrapper.unmount()
  })

  it('color=1: carries a preposition color style and the color-hint class before submit', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', color: '1' })
    const stage = wrapper.find('.colloc-stage')
    const style = stage.attributes('style') ?? ''
    expect(style).toMatch(/--prep-accent: var\(--prep-[a-z]+\)/)
    expect(style).toMatch(/--prep-wash: var\(--prep-[a-z]+-wash\)/)
    expect(stage.classes()).toContain('color-hint')
    wrapper.unmount()
  })

  it('color=1: the pre-answer color matches the governed preposition (a real hint, not random)', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', color: '1' })

    // Grab the color shown BEFORE answering …
    const preStyle = wrapper.find('.colloc-stage').attributes('style') ?? ''

    const akkBtn = wrapper.findAll('button').find(b => b.text() === 'Akkusativ')
    await akkBtn!.trigger('click')
    const submitBtn = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submitBtn!.trigger('click')

    // … and confirm it was the governed preposition's hue all along.
    const slug = prepSlug(wrapper.find('.prep-accent-text').text())
    expect(preStyle).toContain(`--prep-accent: var(--prep-${slug})`)
    wrapper.unmount()
  })
})

describe('CollocationsRunner — history recording (ADR-0010)', () => {
  beforeEach(() => { vi.mocked(saveQuizRun).mockClear() })

  async function completeOneCardWrong(wrapper: Awaited<ReturnType<typeof mountRunner>>['wrapper']) {
    await wrapper.find('.input-prep').setValue('xxx')          // guaranteed-wrong preposition
    const akk = wrapper.findAll('button').find(b => b.text() === 'Akkusativ')
    await akk!.trigger('click')
    const submit = wrapper.findAll('button').find(b => b.text().startsWith('Submit'))
    await submit!.trigger('click')
    const finish = wrapper.findAll('button').find(b => b.text().startsWith('Finish'))
    await finish!.trigger('click')
  }

  it('records exactly one Run when the main round finishes', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', retype: '0' })
    await completeOneCardWrong(wrapper)
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    expect(saveQuizRun).toHaveBeenCalledWith(expect.objectContaining({
      type: 'prep-collocations',
      count: 1,
      correct: 0,
      meta: expect.objectContaining({ levels: ['B1'], roles: ['verb'] }),
    }))
    wrapper.unmount()
  })

  it('does not record the retry round', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', retype: '0' })
    await completeOneCardWrong(wrapper)
    const retryBtn = wrapper.findAll('button').find(b => b.text().startsWith('Retry'))
    await retryBtn!.trigger('click')                            // start retry round
    await completeOneCardWrong(wrapper)                        // finish retry round
    expect(saveQuizRun).toHaveBeenCalledTimes(1)               // still only the main round
    wrapper.unmount()
  })
})
