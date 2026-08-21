// Task 9 — stage card components. Pure props/emits contract tests: no store,
// no router, no naive-ui — the cards take nothing but props and DOM events.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import IntroCard from '../../../src/modules/wortschatz/IntroCard.vue'
import ErkennenCard from '../../../src/modules/wortschatz/ErkennenCard.vue'
import LueckeCard from '../../../src/modules/wortschatz/LueckeCard.vue'
import AbrufCard from '../../../src/modules/wortschatz/AbrufCard.vue'
import AnwendungCard from '../../../src/modules/wortschatz/AnwendungCard.vue'
import { WORTSCHATZ_VOKABELN, clozeParts } from '../../../src/data/wortschatz'

const wortverbindung = WORTSCHATZ_VOKABELN[0] // 'eine Maßnahme ergreifen'
const noun = WORTSCHATZ_VOKABELN[1]           // 'die Verpackung'

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find(b => b.text() === text || b.text().startsWith(text))
}

describe('IntroCard', () => {
  it('mounts and shows the English cue', () => {
    const wrapper = mount(IntroCard, { props: { vokabel: wortverbindung } })
    expect(wrapper.text()).toContain(wortverbindung.en)
  })

  it('reveals the German form after typing a guess and clicking Aufdecken', async () => {
    const wrapper = mount(IntroCard, { props: { vokabel: wortverbindung } })
    await wrapper.find('input').setValue('irgendwas')
    await findButton(wrapper, 'Aufdecken')!.trigger('click')
    expect(wrapper.text()).toContain(wortverbindung.de)
  })

  it('reveals on an empty skip too, and Weiter emits done', async () => {
    const wrapper = mount(IntroCard, { props: { vokabel: wortverbindung } })
    await findButton(wrapper, 'Aufdecken')!.trigger('click')
    expect(wrapper.text()).toContain(wortverbindung.de)
    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('done')).toBeTruthy()
  })
})

describe('ErkennenCard', () => {
  const options = [wortverbindung.en, 'to waste time', 'to open a door', 'to close a shop']

  it('renders 4 options', () => {
    const wrapper = mount(ErkennenCard, { props: { vokabel: wortverbindung, options } })
    expect(wrapper.findAll('.choice')).toHaveLength(4)
  })

  it('clicking the right option, then Weiter, emits answered correct', async () => {
    const wrapper = mount(ErkennenCard, { props: { vokabel: wortverbindung, options } })
    const correctBtn = wrapper.findAll('.choice').find(b => b.text() === wortverbindung.en)!
    await correctBtn.trigger('click')
    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['correct']])
  })

  it('clicking a wrong option, then Weiter, emits answered wrong', async () => {
    const wrapper = mount(ErkennenCard, { props: { vokabel: wortverbindung, options } })
    const wrongBtn = wrapper.findAll('.choice').find(b => b.text() === 'to waste time')!
    await wrongBtn.trigger('click')
    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['wrong']])
  })
})

describe('LueckeCard', () => {
  const satz = wortverbindung.saetze[0]
  const parts = clozeParts(satz.de)!

  function mountCard() {
    return mount(LueckeCard, { props: { vokabel: wortverbindung, satz } })
  }

  it('renders the before/after text around the blank, and the English sentence', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain(parts.before.trim())
    expect(wrapper.text()).toContain(parts.after.trim())
    expect(wrapper.text()).toContain(satz.en)
  })

  it('typing the exact blank + submit emits answered correct', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue(parts.blank)
    await wrapper.find('input').trigger('keydown.enter')
    expect(wrapper.emitted('answered')).toEqual([['correct', parts.blank]])
  })

  it('typing garbage emits rescue-check; resolving false emits answered wrong', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue('komplett falscher Text')
    await wrapper.find('input').trigger('keydown.enter')

    const rescueCalls = wrapper.emitted('rescue-check')
    expect(rescueCalls).toBeTruthy()
    const [given, resolve] = rescueCalls![0] as [string, (ok: boolean) => void]
    expect(given).toBe('komplett falscher Text')
    expect(wrapper.emitted('answered')).toBeFalsy()

    resolve(false)
    expect(wrapper.emitted('answered')).toEqual([['wrong', 'komplett falscher Text']])
  })

  it('resolving a rescue-check true emits answered correct', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue('etwas Falsches')
    await wrapper.find('input').trigger('keydown.enter')
    const [, resolve] = wrapper.emitted('rescue-check')![0] as [string, (ok: boolean) => void]
    resolve(true)
    expect(wrapper.emitted('answered')).toEqual([['correct', 'etwas Falsches']])
  })

  it('pressing the hint then answering right caps the outcome at hint', async () => {
    const wrapper = mountCard()
    await findButton(wrapper, 'Erster Buchstabe')!.trigger('click')
    await wrapper.find('input').setValue(parts.blank)
    await wrapper.find('input').trigger('keydown.enter')
    expect(wrapper.emitted('answered')).toEqual([['hint', parts.blank]])
  })

  it('shows a reason chip on a final wrong verdict', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue('komplett falscher Text')
    await wrapper.find('input').trigger('keydown.enter')
    const [, resolve] = wrapper.emitted('rescue-check')![0] as [string, (ok: boolean) => void]
    resolve(false)
    await nextTick()
    expect(wrapper.text()).toMatch(/Wort|Endung|Artikel|Präposition/)
  })
})

describe('AbrufCard', () => {
  function mountCard() {
    return mount(AbrufCard, { props: { vokabel: noun } })
  }

  it('shows the English cue and the noun-with-article hint', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain(noun.en)
    expect(wrapper.text()).toContain('Nomen: mit Artikel')
  })

  it('typing the exact de form emits answered correct', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue(noun.de)
    await wrapper.find('input').trigger('keydown.enter')
    expect(wrapper.emitted('answered')).toEqual([['correct', noun.de]])
  })

  it('a wrong article emits rescue-check; resolving false emits answered wrong', async () => {
    const wrapper = mountCard()
    const wrongArticle = noun.de.replace(/^die\b/, 'der')
    await wrapper.find('input').setValue(wrongArticle)
    await wrapper.find('input').trigger('keydown.enter')

    const rescueCalls = wrapper.emitted('rescue-check')
    expect(rescueCalls).toBeTruthy()
    const [given, resolve] = rescueCalls![0] as [string, (ok: boolean) => void]
    expect(given).toBe(wrongArticle)

    resolve(false)
    expect(wrapper.emitted('answered')).toEqual([['wrong', wrongArticle]])
  })
})

describe('AnwendungCard', () => {
  const baseProps = { vokabel: wortverbindung, grading: false, result: null }

  it('disables submit under the 5-word minimum', async () => {
    const wrapper = mount(AnwendungCard, { props: baseProps })
    await wrapper.find('textarea').setValue('Zu kurz.')
    expect(findButton(wrapper, 'Absenden')!.attributes('disabled')).toBeDefined()
  })

  it('emits submit with the typed sentence once the word minimum is met', async () => {
    const wrapper = mount(AnwendungCard, { props: baseProps })
    const sentence = 'Die Regierung wird bald eine Maßnahme ergreifen müssen.'
    await wrapper.find('textarea').setValue(sentence)
    const submitBtn = findButton(wrapper, 'Absenden')!
    expect(submitBtn.attributes('disabled')).toBeUndefined()
    await submitBtn.trigger('click')
    expect(wrapper.emitted('submit')).toEqual([[sentence]])
  })

  it('shows a grading state and hides the textarea while grading', () => {
    const wrapper = mount(AnwendungCard, { props: { ...baseProps, grading: true } })
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('shows feedback when result is set, and Weiter emits next', async () => {
    const wrapper = mount(AnwendungCard, {
      props: {
        ...baseProps,
        result: { correct: false, feedback: 'Das passt noch nicht zur Zielform.', korrektur: 'Die Stadt ergreift eine Maßnahme.' }
      }
    })
    expect(wrapper.text()).toContain('Das passt noch nicht zur Zielform.')
    expect(wrapper.text()).toContain('Die Stadt ergreift eine Maßnahme.')
    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('next')).toBeTruthy()
  })
})
