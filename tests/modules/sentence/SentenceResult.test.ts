import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SentenceResult from '../../../src/modules/sentence/SentenceResult.vue'
import { aggregateOutcomes, type CardOutcome } from '../../../src/composables/usePackedSentenceQuiz'
import { CONNECTORS } from '../../../src/data/connectors'

const CONN = CONNECTORS.find(c => c.id === 'aber')!
function outcome(verdict: 'ok' | 'part' | 'no'): CardOutcome {
  return {
    card: {
      index: 0,
      items: [
        { key: 'v1', cat: 'verb', verb: { german: 'warten', english: 'wait', level: 'B1', case: 'accusative' } },
        { key: 'k1', cat: 'conn', conn: CONN }
      ],
      english: 'We are waiting, but he is not coming.',
      german: 'Wir warten, aber er kommt nicht.',
      sents: 1,
      spans: [{ key: 'v1', en: 'waiting' }, { key: 'k1', en: 'but' }]
    },
    answer: 'Wir warten, aber er kommt nicht.',
    verdict,
    items: [
      { key: 'v1', correct: verdict === 'ok' },
      { key: 'k1', correct: verdict !== 'no', tags: verdict === 'no' ? ['connector'] : undefined }
    ],
    offline: false
  }
}

describe('aggregateOutcomes', () => {
  it('sums per-category hits and tag counts', () => {
    const agg = aggregateOutcomes([outcome('ok'), outcome('no')])
    expect(agg.cat.verb).toEqual({ ok: 1, n: 2 })
    expect(agg.cat.conn).toEqual({ ok: 1, n: 2 })
    expect(agg.tags.connector).toBe(1)
  })
})

describe('SentenceResult', () => {
  it('shows all-or-nothing card score and items-hit subtitle', () => {
    const w = mount(SentenceResult, { props: { history: [outcome('ok'), outcome('part'), outcome('no')], direction: 'en-de' } })
    expect(w.find('.sn-res-score').text().replace(/\s+/g, ' ')).toContain('1 / 3')
    expect(w.find('.sn-res-sub').text()).toContain('Items getroffen')
  })
  it('offers Fehler üben with the wrong+partly cards (EN→DE only)', async () => {
    const w = mount(SentenceResult, { props: { history: [outcome('ok'), outcome('part'), outcome('no')], direction: 'en-de' } })
    const btn = w.findAll('button').find(b => b.text().includes('Fehler üben'))!
    expect(btn.text()).toContain('2')
    await btn.trigger('click')
    expect(w.emitted('practice')![0][0]).toHaveLength(2)
  })
  it('hides Fehler üben and tags for DE→EN', () => {
    const outcomes = [{ ...outcome('no'), items: null }]
    const w = mount(SentenceResult, { props: { history: outcomes, direction: 'de-en' } })
    expect(w.findAll('button').some(b => b.text().includes('Fehler üben'))).toBe(false)
    expect(w.text()).toContain('keine Fehler-Tags')
  })
})

const IDIOM = { spans: ['wechselte', 'den Besitzer'], form: 'den Besitzer wechseln', gloss: 'to change hands' }

function idiomOutcome(): CardOutcome {
  const base = outcome('ok')
  return {
    ...base,
    card: { ...base.card, german: 'Die Macht wechselte über Nacht den Besitzer.', idiom: IDIOM }
  }
}

describe('SentenceResult · idiom hookup (recap Referenz line)', () => {
  it('underlines the idiom spans in an opened card\'s Referenz line (EN→DE)', async () => {
    const w = mount(SentenceResult, { props: { history: [idiomOutcome()], direction: 'en-de' } })
    await w.find('.sna-resrow-h').trigger('click')
    const idiomSpans = w.findAll('.sn-i[data-cat="idiom"]')
    expect(idiomSpans).toHaveLength(2)
    expect(idiomSpans[0].find('em').text()).toBe(IDIOM.form)
    expect(idiomSpans[0].find('.sn-pop').text()).toContain(IDIOM.gloss)
  })

  it('never annotates the German source shown in DE→EN (idiom stays plain)', async () => {
    const base = outcome('ok')
    const deEnOutcome: CardOutcome = { ...base, items: null, card: { ...base.card, german: 'Die Macht wechselte über Nacht den Besitzer.', idiom: IDIOM } }
    const w = mount(SentenceResult, { props: { history: [deEnOutcome], direction: 'de-en' } })
    await w.find('.sna-resrow-h').trigger('click')
    expect(w.findAll('.sn-i[data-cat="idiom"]')).toHaveLength(0)
    expect(w.text()).toContain('Die Macht wechselte über Nacht den Besitzer.')
  })
})

function themedOutcome(label: string, id: string): CardOutcome {
  const base = outcome('ok')
  return { ...base, card: { ...base.card, domain: { id, label, scene: 'set it during a failed deployment', form: 'erklaerend' } } }
}

describe('SentenceResult · Fachgebiet', () => {
  it('names each Fachgebiet the run used, once', () => {
    const wrapper = mount(SentenceResult, {
      props: {
        direction: 'en-de',
        history: [themedOutcome('Docker', 'docker'), themedOutcome('Docker', 'docker'), themedOutcome('.NET', 'dotnet')]
      }
    })
    expect(wrapper.text()).toContain('Fachgebiet: Docker · .NET')
  })

  it('says nothing about Fachgebiete in an untargeted run', () => {
    const wrapper = mount(SentenceResult, {
      props: { direction: 'en-de', history: [outcome('ok'), outcome('no')] }
    })
    expect(wrapper.text()).not.toContain('Fachgebiet')
  })
})
