import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GermanSolutionText from '../../src/components/GermanSolutionText.vue'
import type { IdiomInfo } from '../../src/composables/useIdiomHighlight'

const TEXT = 'Die Macht wechselte damals den Besitzer, ganz plötzlich.'
const IDIOM: IdiomInfo = { spans: ['wechselte', 'den Besitzer'], form: 'den Besitzer wechseln', gloss: 'to change hands' }

/** The rendered text with popover overlay content stripped out — the popover
 *  is an always-in-DOM, CSS-hidden annotation layer (same pattern as
 *  SentenceRunner's `.sn-pop`), so `element.textContent` alone includes it
 *  even though it never appears on screen. This is what "lossless" means:
 *  the visible sentence text, not the popovers riding along with it. */
function visibleText(el: Element): string {
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.sn-pop').forEach(p => p.remove())
  return clone.textContent ?? ''
}

describe('GermanSolutionText', () => {
  it('renders plain text with no extra markup when there is no idiom', () => {
    const w = mount(GermanSolutionText, { props: { text: TEXT } })
    expect(w.text()).toBe(TEXT)
    expect(w.findAll('.sn-i')).toHaveLength(0)
  })

  it('is lossless: the concatenated rendered text equals the input exactly, with an idiom', () => {
    const w = mount(GermanSolutionText, { props: { text: TEXT, idiom: IDIOM } })
    expect(visibleText(w.element)).toBe(TEXT)
  })

  it('marks each idiom span with data-cat="idiom" and the sn-i/has-pop classes', () => {
    const w = mount(GermanSolutionText, { props: { text: TEXT, idiom: IDIOM } })
    const spans = w.findAll('.sn-i')
    expect(spans).toHaveLength(2)
    for (const s of spans) {
      expect(s.attributes('data-cat')).toBe('idiom')
      expect(s.classes()).toContain('has-pop')
      expect(s.attributes('tabindex')).toBe('0')
    }
    expect(spans.map(s => s.text())).toEqual(
      expect.arrayContaining([expect.stringContaining('wechselte'), expect.stringContaining('den Besitzer')])
    )
  })

  it('every idiom span popover shows the dictionary form (emphasized) and the gloss', () => {
    const w = mount(GermanSolutionText, { props: { text: TEXT, idiom: IDIOM } })
    const pops = w.findAll('.sn-pop')
    expect(pops).toHaveLength(2)
    for (const pop of pops) {
      expect(pop.find('em').text()).toBe(IDIOM.form)
      expect(pop.text()).toContain(IDIOM.gloss)
    }
  })

  it('drops an unmatchable span silently and still renders the rest as idiom', () => {
    const partial: IdiomInfo = { spans: ['wechselte', 'nicht vorhanden'], form: 'den Besitzer wechseln', gloss: 'to change hands' }
    const w = mount(GermanSolutionText, { props: { text: TEXT, idiom: partial } })
    expect(visibleText(w.element)).toBe(TEXT)
    expect(w.findAll('.sn-i')).toHaveLength(1)
  })

  it('renders plainly (no .sn-i at all) when the idiom has no span that matches the text', () => {
    // Defensive: even if a caller hands a stale IdiomInfo whose spans no
    // longer occur in `text`, rendering must still degrade to plain text.
    const stale: IdiomInfo = { spans: ['nicht da'], form: 'x', gloss: 'y' }
    const w = mount(GermanSolutionText, { props: { text: TEXT, idiom: stale } })
    expect(visibleText(w.element)).toBe(TEXT)
    expect(w.findAll('.sn-i')).toHaveLength(0)
  })

  it('toggles the .revealed class on click and clears it on a second click', async () => {
    const w = mount(GermanSolutionText, { props: { text: TEXT, idiom: IDIOM } })
    const span = w.findAll('.sn-i')[0]
    expect(span.classes()).not.toContain('revealed')
    await span.trigger('click')
    expect(span.classes()).toContain('revealed')
    await span.trigger('click')
    expect(span.classes()).not.toContain('revealed')
  })

  it('toggles .revealed on Enter and Space keydown', async () => {
    const w = mount(GermanSolutionText, { props: { text: TEXT, idiom: IDIOM } })
    const span = w.findAll('.sn-i')[0]
    await span.trigger('keydown.enter')
    expect(span.classes()).toContain('revealed')
    await span.trigger('keydown.space')
    expect(span.classes()).not.toContain('revealed')
  })

  it('clears revealed state when `text` changes — a reused instance must not carry a stale reveal onto a new sentence', async () => {
    const w = mount(GermanSolutionText, { props: { text: TEXT, idiom: IDIOM } })
    const span = w.findAll('.sn-i')[0]
    await span.trigger('click')
    expect(span.classes()).toContain('revealed')

    const otherText = 'Er hat den Besitzer gewechselt, ganz plötzlich, letzte Woche.'
    await w.setProps({ text: otherText, idiom: { ...IDIOM, spans: ['gewechselt'] } })
    expect(w.findAll('.sn-i')[0]?.classes()).not.toContain('revealed')
  })

  it('clears revealed state when `idiom` changes even though `text` stays the same', async () => {
    const w = mount(GermanSolutionText, { props: { text: TEXT, idiom: IDIOM } })
    const span = w.findAll('.sn-i')[0]
    await span.trigger('click')
    expect(span.classes()).toContain('revealed')

    await w.setProps({ text: TEXT, idiom: { ...IDIOM, form: 'ein anderes Idiom', gloss: 'a different idiom' } })
    expect(w.findAll('.sn-i')[0]?.classes()).not.toContain('revealed')
  })
})
