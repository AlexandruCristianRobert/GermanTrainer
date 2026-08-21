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

/** Mirrors useVokabelAttempt's stripLeadingArticle — the hint reveals the head
 * word, not a leading article, so expectations here must strip it too. */
function stripLeadingArticle(s: string): string {
  return s.replace(/^(der|die|das|ein|eine|einen|einem|einer|eines|den|dem|des)\s+/i, '')
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

  it('typing the exact blank + submit reveals the verdict, but answered waits for Weiter', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue(parts.blank)
    await wrapper.find('input').trigger('keydown.enter')
    // Fix round 1, finding 1: the reveal renders on the same tick the local
    // grade settles, but 'answered' must not fire until the card is advanced.
    expect(wrapper.text()).toContain('Richtig.')
    expect(wrapper.emitted('answered')).toBeFalsy()

    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['correct', parts.blank]])
  })

  it('typing garbage emits rescue-check; resolving false settles wrong, answered waits for Weiter', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue('komplett falscher Text')
    await wrapper.find('input').trigger('keydown.enter')

    const rescueCalls = wrapper.emitted('rescue-check')
    expect(rescueCalls).toBeTruthy()
    const [given, resolve] = rescueCalls![0] as [string, (ok: boolean) => void]
    expect(given).toBe('komplett falscher Text')
    expect(wrapper.emitted('answered')).toBeFalsy()

    resolve(false)
    await nextTick()
    expect(wrapper.text()).toContain('Nicht ganz.')
    expect(wrapper.emitted('answered')).toBeFalsy()

    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['wrong', 'komplett falscher Text']])
  })

  it('resolving a rescue-check true settles correct; Weiter emits answered correct', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue('etwas Falsches')
    await wrapper.find('input').trigger('keydown.enter')
    const [, resolve] = wrapper.emitted('rescue-check')![0] as [string, (ok: boolean) => void]
    resolve(true)
    await nextTick()
    expect(wrapper.emitted('answered')).toBeFalsy()

    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['correct', 'etwas Falsches']])
  })

  it('pressing the hint then answering right caps the outcome at hint', async () => {
    const wrapper = mountCard()
    await findButton(wrapper, 'Erster Buchstabe')!.trigger('click')
    await wrapper.find('input').setValue(parts.blank)
    await wrapper.find('input').trigger('keydown.enter')
    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['hint', parts.blank]])
  })

  it('caps the hint reveal at 3 presses', async () => {
    const wrapper = mountCard()
    for (let i = 0; i < 5; i++) {
      await findButton(wrapper, 'Erster Buchstabe')!.trigger('click')
    }
    expect(wrapper.find('.hint-chars').text()).toBe(stripLeadingArticle(parts.blank).slice(0, 3))
  })

  it('shows the reason chip Artikel on a final wrong verdict', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue('komplett falscher Text')
    await wrapper.find('input').trigger('keydown.enter')
    const [, resolve] = wrapper.emitted('rescue-check')![0] as [string, (ok: boolean) => void]
    resolve(false)
    await nextTick()
    // 'eine' (the blank's first token) is a closed-class article — gradeAgainst
    // must fail it with reason 'article', not the looser 'word'/'ending' path.
    expect(wrapper.find('.reason-chip').text()).toBe('Artikel')
  })

  it('round 2: a satz-level blankVariant grades correct locally, with no rescue-check', async () => {
    // Inline fixture, built so the pass can ONLY come from the blankVariants
    // wiring: the blank is a *participle* form, so it is NOT equal to v.de
    // ('eine Maßnahme ergreifen') and the v.variants path is never consulted;
    // and the typed answer ('Maßnahmen ergriffen') is NOT in v.variants
    // (which holds the infinitive 'Maßnahmen ergreifen'). Drop the 5th
    // argument at the LueckeCard call site and this test must fail.
    const satzWithVariant = {
      de: 'Die Firma hat damals bereits {{eine Maßnahme ergriffen}}.',
      en: 'The company had already taken a measure back then.',
      blankVariants: ['Maßnahmen ergriffen'],
    }
    const wrapper = mount(LueckeCard, { props: { vokabel: wortverbindung, satz: satzWithVariant } })

    await wrapper.find('input').setValue('Maßnahmen ergriffen')
    await wrapper.find('input').trigger('keydown.enter')

    expect(wrapper.emitted('rescue-check')).toBeFalsy()
    expect(wrapper.text()).toContain('Richtig.')

    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['correct', 'Maßnahmen ergriffen']])
  })

  it('round 2: the identical blank WITHOUT blankVariants is a local miss', async () => {
    // Negative control that keeps the test above honest: same fixture, same
    // typed answer, only `blankVariants` removed. It must now MISS locally
    // (→ rescue-check). If this one ever starts passing as correct, the blank
    // has drifted into v.de / v.variants territory and its sibling has gone
    // vacuous again.
    const satzWithoutVariant = {
      de: 'Die Firma hat damals bereits {{eine Maßnahme ergriffen}}.',
      en: 'The company had already taken a measure back then.',
    }
    const wrapper = mount(LueckeCard, { props: { vokabel: wortverbindung, satz: satzWithoutVariant } })

    await wrapper.find('input').setValue('Maßnahmen ergriffen')
    await wrapper.find('input').trigger('keydown.enter')

    expect(wrapper.emitted('rescue-check')).toBeTruthy()
    expect(wrapper.text()).not.toContain('Richtig.')
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

  it('typing the exact de form reveals the verdict, but answered waits for Weiter', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue(noun.de)
    await wrapper.find('input').trigger('keydown.enter')
    expect(wrapper.text()).toContain('Richtig.')
    expect(wrapper.emitted('answered')).toBeFalsy()

    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['correct', noun.de]])
  })

  it('a wrong article emits rescue-check; resolving false settles wrong, answered waits for Weiter', async () => {
    const wrapper = mountCard()
    const wrongArticle = noun.de.replace(/^die\b/, 'der')
    await wrapper.find('input').setValue(wrongArticle)
    await wrapper.find('input').trigger('keydown.enter')

    const rescueCalls = wrapper.emitted('rescue-check')
    expect(rescueCalls).toBeTruthy()
    const [given, resolve] = rescueCalls![0] as [string, (ok: boolean) => void]
    expect(given).toBe(wrongArticle)

    resolve(false)
    await nextTick()
    expect(wrapper.emitted('answered')).toBeFalsy()

    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['wrong', wrongArticle]])
  })

  it('Erster Buchstabe reveals the article-stripped head word, not the article', async () => {
    const wrapper = mountCard()
    await findButton(wrapper, 'Erster Buchstabe')!.trigger('click')
    // noun.de is 'die Verpackung' — the hint source strips 'die ' so the
    // first press shows 'V', not the already-obvious article's 'd'.
    expect(wrapper.find('.hint-chars').text()).toBe('V')
  })

  it('pressing the hint then answering right caps the outcome at hint, after Weiter', async () => {
    const wrapper = mountCard()
    await findButton(wrapper, 'Erster Buchstabe')!.trigger('click')
    await wrapper.find('input').setValue(noun.de)
    await wrapper.find('input').trigger('keydown.enter')
    expect(wrapper.emitted('answered')).toBeFalsy()

    await findButton(wrapper, 'Weiter')!.trigger('click')
    expect(wrapper.emitted('answered')).toEqual([['hint', noun.de]])
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

  it('shows the learner\'s own submitted sentence above the verdict', async () => {
    const sentence = 'Die Regierung wird bald eine Maßnahme ergreifen müssen.'
    const wrapper = mount(AnwendungCard, { props: baseProps })
    await wrapper.find('textarea').setValue(sentence)
    await findButton(wrapper, 'Absenden')!.trigger('click')
    await wrapper.setProps({ grading: true })
    await wrapper.setProps({
      grading: false,
      result: { correct: true, feedback: 'Gut verwendet.' }
    })
    expect(wrapper.find('.anw-own-sentence').text()).toContain(sentence)
  })

  it('fix round 1, finding 2: a failed grading pass (grading back to false, result still null) re-enables Absenden', async () => {
    const wrapper = mount(AnwendungCard, { props: baseProps })
    const sentence = 'Die Regierung wird bald eine Maßnahme ergreifen müssen.'
    await wrapper.find('textarea').setValue(sentence)
    await findButton(wrapper, 'Absenden')!.trigger('click')
    expect(wrapper.emitted('submit')).toEqual([[sentence]])

    // Runner starts grading, then fails (AI error / offline) and drops back
    // to grading=false with result still null — the composer must return.
    await wrapper.setProps({ grading: true })
    expect(wrapper.find('textarea').exists()).toBe(false)
    await wrapper.setProps({ grading: false, result: null })

    expect(wrapper.find('textarea').exists()).toBe(true)
    const submitBtn = findButton(wrapper, 'Absenden')!
    expect(submitBtn.attributes('disabled')).toBeUndefined()

    await submitBtn.trigger('click')
    expect(wrapper.emitted('submit')).toEqual([[sentence], [sentence]])
  })
})
