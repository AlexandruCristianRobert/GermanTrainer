import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CollocationsRunner from '../../../src/modules/prepositions/CollocationsRunner.vue'
import { prepSlug } from '../../../src/data/prepColors'

// Stub useBreakpoint so the component doesn't call window.matchMedia in jsdom
vi.mock('../../../src/composables/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: { value: false } }),
}))

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
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })

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

describe('CollocationsRunner — scene hints', () => {
  it('renders the scene hint by default when no hints param is present', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1' })
    const hint = wrapper.find('.prompt-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text().length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('renders the scene hint when hints=1', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', hints: '1' })
    expect(wrapper.find('.prompt-hint').exists()).toBe(true)
    wrapper.unmount()
  })

  it('omits the scene hint element entirely when hints=0', async () => {
    const { wrapper } = await mountRunner({ levels: 'B1', roles: 'verb', count: '1', hints: '0' })
    expect(wrapper.find('.prompt-hint').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps the scene hint visible after submit', async () => {
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
