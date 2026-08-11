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

function themedOutcome(label: string, id: string): CardOutcome {
  const base = outcome('ok')
  return { ...base, card: { ...base.card, domain: { id, label, scene: 'set it during a failed deployment' } } }
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
