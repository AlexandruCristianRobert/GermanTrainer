import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import NDeklRunner from '../../src/modules/ndekl/NDeklRunner.vue'
import { filterNDeklItems, NDEKL_CLASSIFY_OPTIONS } from '../../src/data/nDeklination'

vi.mock('../../src/composables/useQuizHistory', () => ({ saveQuizRun: vi.fn() }))
import { saveQuizRun } from '../../src/composables/useQuizHistory'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/ndekl', name: 'ndekl', component: { template: '<div />' } },
      { path: '/ndekl/run', name: 'ndekl-run', component: { template: '<div />' } },
    ],
  })
}

async function mountRunner(query: Record<string, string>) {
  const router = makeRouter()
  await router.push({ name: 'ndekl-run', query })
  const wrapper = mount(NDeklRunner, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

// Math.random pinned to 0 → identity-preserving shuffle, so card N is the Nth
// bank entry under the query's filters.
const FORM_QUERY = { count: '1', levels: 'B1', kinds: 'form' }
const CLASSIFY_QUERY = { count: '1', levels: 'B1', kinds: 'classify' }
const FORMS = filterNDeklItems({ levels: ['B1'], kinds: ['form'] })
const CLASSIFIES = filterNDeklItems({ levels: ['B1'], kinds: ['classify'] })
const F1 = FORMS[0]
const F2 = FORMS[1]
const C1 = CLASSIFIES[0]

describe('NDeklRunner', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.mocked(saveQuizRun).mockClear()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => { randomSpy.mockRestore() })

  it('has at least two B1 form items and one B1 classify item for the fixtures', () => {
    expect(FORMS.length).toBeGreaterThanOrEqual(2)
    expect(CLASSIFIES.length).toBeGreaterThanOrEqual(1)
  })

  it('renders a form card as a gapped sentence with a typed input and no choices', async () => {
    const w = await mountRunner(FORM_QUERY)
    const sentence = w.find('.drill-sentence')
    expect(sentence.text()).toContain(F1.prompt.split('___')[0].trim())
    expect(sentence.text()).toContain(F1.prompt.split('___')[1].trim())
    expect(sentence.find('.drill-gap').exists()).toBe(true)
    expect(w.find('input.type-input').exists()).toBe(true)
    expect(w.find('.choice').exists()).toBe(false)
    w.unmount()
  })

  it('accepts the exact weak form and shows the explanation', async () => {
    const w = await mountRunner(FORM_QUERY)
    await w.find('input.type-input').setValue(F1.answers[0])
    await w.find('button.drill-check').trigger('click')
    expect(w.find('.feedback-line.correct').exists()).toBe(true)
    expect(w.find('.feedback-line').text()).toContain('Richtig')
    expect(w.text()).toContain(F1.explanation)
    w.unmount()
  })

  it('folds case and umlauts when grading the typed form', async () => {
    const w = await mountRunner(FORM_QUERY)
    await w.find('input.type-input').setValue(`  ${F1.answers[0].toLowerCase()}  `)
    await w.find('button.drill-check').trigger('click')
    expect(w.find('.feedback-line.correct').exists()).toBe(true)
    w.unmount()
  })

  it('marks a wrong typed form wrong and reveals the expected form', async () => {
    const w = await mountRunner(FORM_QUERY)
    await w.find('input.type-input').setValue('Kollege')
    await w.find('button.drill-check').trigger('click')
    expect(w.find('.feedback-line.wrong').exists()).toBe(true)
    expect(w.find('.feedback-line').text()).toContain('Noch nicht')
    expect(w.text()).toContain(F1.answers[0])
    expect(w.text()).toContain(F1.explanation)
    w.unmount()
  })

  it('renders a classify card as exactly the two-way choice and grades a correct pick', async () => {
    const w = await mountRunner(CLASSIFY_QUERY)
    const labels = w.findAll('.choice').map(b => b.find('.c-label').text())
    expect(labels).toEqual([...NDEKL_CLASSIFY_OPTIONS])
    expect(w.find('input.type-input').exists()).toBe(false)
    expect(w.find('.drill-sentence').text()).toContain(C1.prompt)
    const btn = w.findAll('.choice').find(b => b.find('.c-label').text() === C1.answers[0])!
    await btn.trigger('click')
    expect(w.find('.feedback-line.correct').exists()).toBe(true)
    expect(w.text()).toContain(C1.explanation)
    w.unmount()
  })

  it('records exactly one ndekl-form Run with attempted/correct counts', async () => {
    const w = await mountRunner({ ...FORM_QUERY, count: '2' })
    await w.find('input.type-input').setValue(F1.answers[0])
    await w.find('button.drill-check').trigger('click')
    await w.find('button.drill-advance').trigger('click')
    await w.find('input.type-input').setValue('völlig falsch')
    await w.find('button.drill-check').trigger('click')
    await w.find('button.drill-advance').trigger('click')
    expect(saveQuizRun).toHaveBeenCalledTimes(1)
    const run = vi.mocked(saveQuizRun).mock.calls[0][0]
    expect(run.type).toBe('ndekl-form')
    expect(run.count).toBe(2)
    expect(run.correct).toBe(1)
    // meta records WHAT was drilled — the parsed query filters, so History can
    // say more than "an ndekl round happened".
    expect(run.meta.levels).toEqual(['B1'])
    expect(run.meta.kinds).toEqual(['form'])
    expect(F2.kind).toBe('form')
    w.unmount()
  })

  it('Enter grades the typed answer, and an empty answer grades nothing', async () => {
    const w = await mountRunner(FORM_QUERY)
    await w.find('input.type-input').trigger('keydown.enter')
    expect(w.find('.drill-feedback').exists()).toBe(false)
    await w.find('input.type-input').setValue(F1.answers[0])
    await w.find('input.type-input').trigger('keydown.enter')
    expect(w.find('.feedback-line.correct').exists()).toBe(true)
    w.unmount()
  })

  it('focuses the input on load, the advance button after grading, the next input after that', async () => {
    const w = await mountRunner({ ...FORM_QUERY, count: '2' })
    await nextTick()
    expect(document.activeElement).toBe(w.find('input.type-input').element)
    await w.find('input.type-input').setValue(F1.answers[0])
    await w.find('input.type-input').trigger('keydown.enter')
    await nextTick()
    expect(document.activeElement).toBe(w.find('button.drill-advance').element)
    await w.find('button.drill-advance').trigger('click')
    await nextTick()
    expect(document.activeElement).toBe(w.find('input.type-input').element)
    w.unmount()
  })

  it('digit keys pick on a classify card but never grade a typed one', async () => {
    const c = await mountRunner(CLASSIFY_QUERY)
    const at = C1.options.indexOf(C1.answers[0])
    window.dispatchEvent(new KeyboardEvent('keydown', { key: String(at + 1) }))
    await nextTick()
    expect(c.find('.feedback-line.correct').exists()).toBe(true)
    c.unmount()

    // On a typed card the digits belong in the input, not to the grader.
    const f = await mountRunner(FORM_QUERY)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    await nextTick()
    expect(f.find('.drill-feedback').exists()).toBe(false)
    f.unmount()
  })

  it('shows an error and no card when the filters match nothing', async () => {
    const w = await mountRunner({ count: '5', levels: 'B1', kinds: 'nonesuch' })
    expect(w.find('.alert-danger').exists()).toBe(true)
    expect(w.find('input.type-input').exists()).toBe(false)
    expect(saveQuizRun).not.toHaveBeenCalled()
    w.unmount()
  })
})
