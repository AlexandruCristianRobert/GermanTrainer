import { describe, it, expect, beforeEach } from 'vitest'
import { buildTagesplan } from '../../src/composables/useTagesplan'
import { appendCorrections, recordDrillResult, clearArchive } from '../../src/composables/useSprechenArchive'
import { LEDGER_KEY } from '../../src/composables/useDativeLedger'
import type { ArchivedCorrection } from '../../src/composables/useSprechenArchive'
import type { QuizHistoryEntry, PrepDrillItem, VerbDrillItem } from '../../src/composables/useQuizHistory'

const DAY = 86_400_000
const base: Omit<ArchivedCorrection, 'id' | 'createdAt'> = {
  discussionId: 'd-1', topicTitle: 'Ehrenamt', modality: 'typed',
  kind: 'grammar', quote: 'für die Wettkämpfe', suggested: 'zu den Wettkämpfen',
  reasonDe: 'Ziel: zu + Dativ.', reasonEn: 'Destination takes zu.', context: 'Ich bin für die Wettkämpfe gefahren.'
}

// Weak-point fixtures follow the shape used by tests/composables/usePrepRemedial.test.ts
// and useVerbSentenceStats.test.ts — a run entry whose meta carries the per-item
// evidence the scorers read. weightedScore is (wrong/seen)·ln(seen), so an item
// seen once scores 0 no matter what: every "weak" fixture below is seen ≥ 2.
function prepRun(sentenceItems: PrepDrillItem[]): QuizHistoryEntry {
  return {
    id: 9001, type: 'prep-sentence', startedAt: '', finishedAt: '', durationMs: 0,
    count: sentenceItems.length, correct: sentenceItems.filter(i => i.correct).length,
    meta: { sentenceItems }
  }
}

function verbRun(verbSentenceItems: VerbDrillItem[]): QuizHistoryEntry {
  return {
    id: 9002, type: 'verb-sentence', startedAt: '', finishedAt: '', durationMs: 0,
    count: verbSentenceItems.length, correct: verbSentenceItems.filter(i => i.correct).length,
    meta: { verbSentenceItems }
  }
}

beforeEach(async () => {
  await clearArchive()
  localStorage.clear()
})

describe('buildTagesplan (ADR-0026)', () => {
  it('empty state → no rows at all', async () => {
    expect(await buildTagesplan([])).toEqual([])
  })

  it('Korrekturen row counts offen and fällig side by side and links to the drill', async () => {
    const [a] = await appendCorrections([{ ...base, quote: 'a' }])
    await appendCorrections([{ ...base, quote: 'b' }, { ...base, quote: 'c' }])
    await recordDrillResult(a.id, true)
    const rows = await buildTagesplan([], Date.now() + 4 * DAY)  // a is fällig (3-day interval elapsed)
    const k = rows.find(r => r.id === 'korrekturen')!
    expect(k.route).toBe('sprechen-drill')
    expect(k.count).toBe(3)
    expect(k.detail).toBe('2 offen · 1 fällig')
    expect(rows[0].id).toBe('korrekturen')   // first section in order
  })

  it('Dativ row lists up to three wackelige items, longest-unseen first, and the surplus as +N', async () => {
    // seed the ledger store directly: four wackelig entries (last encounter wrong)
    const entry = (lastAt: number) => ({ recent: [false], encounters: 1, lastAt })
    localStorage.setItem(LEDGER_KEY, JSON.stringify({
      helfen: entry(4_000), danken: entry(1_000), folgen: entry(3_000), gehören: entry(2_000)
    }))
    const rows = await buildTagesplan([])
    const d = rows.find(r => r.id === 'dativ-wackelig')!
    expect(d.route).toBe('dative')
    expect(d.count).toBe(4)
    expect(d.detail).toBe('danken · gehören · folgen · +1')
    expect(d.title).toBe('Dativ · Wackelige Wörter')
  })

  it('gesichert and new ledger entries produce no Dativ row', async () => {
    localStorage.setItem(LEDGER_KEY, JSON.stringify({
      helfen: { recent: [true, true, true], encounters: 3, lastAt: 1 }
    }))
    expect((await buildTagesplan([])).find(r => r.id === 'dativ-wackelig')).toBeUndefined()
  })

  it('band rows come from the mastery rollup, lowest band first, capped at three, titled from the catalogue', async () => {
    // rollup shape per useDrillMastery: Record<key, { runs, total, correct, lastAt }>
    localStorage.setItem('gt:drillTotals', JSON.stringify({
      'dat-T10': { runs: 1, total: 4, correct: 1, lastAt: 1 },   // band 1
      'dw-T1':  { runs: 2, total: 12, correct: 7, lastAt: 1 },   // band 2 (>=10, acc .583)
      'dac-T5': { runs: 1, total: 5, correct: 1, lastAt: 1 },    // band 1 (acc .2)
      'dat-T6': { runs: 9, total: 80, correct: 76, lastAt: 1 },  // band 5 — never shown
    }))
    localStorage.setItem('gt:drillTotalsSeeded', '1')
    const rows = await buildTagesplan([])
    const bands = rows.filter(r => r.id.startsWith('band-'))
    expect(bands).toHaveLength(3)
    expect(bands[0].id).toBe('band-dac-T5')       // band 1, accuracy .2 < .25
    expect(bands[1].id).toBe('band-dat-T10')      // band 1, accuracy .25
    expect(bands[2].id).toBe('band-dw-T1')        // band 2
    expect(bands[1].route).toBe('dative-free')    // catalogue card route for dat T10
    expect(bands[1].title).toBe('Dativ · Freier Dativ')  // MODULE_LABEL.dat + the card's own `de`
    expect(bands[1].detail).toBe('Band 1 · 25 % · 4 Fragen')
    expect(bands[1].count).toBe(1)
  })

  it('band rows carry the catalogue card query, so two cards sharing one route stay distinguishable', async () => {
    // dac-T14 and dac-T15 both route to 'dacompounds-sentence' and differ ONLY
    // by query.direction. Dropping the query would send the DE→EN row to the
    // EN→DE drill, so the query must travel with the row.
    localStorage.setItem('gt:drillTotals', JSON.stringify({
      'dac-T14': { runs: 1, total: 4, correct: 1, lastAt: 1 },   // band 1, acc .25
      'dac-T15': { runs: 1, total: 5, correct: 1, lastAt: 1 },   // band 1, acc .2
    }))
    localStorage.setItem('gt:drillTotalsSeeded', '1')
    const rows = await buildTagesplan([])
    const t14 = rows.find(r => r.id === 'band-dac-T14')!
    const t15 = rows.find(r => r.id === 'band-dac-T15')!
    expect(t14.route).toBe('dacompounds-sentence')
    expect(t15.route).toBe('dacompounds-sentence')
    expect(t14.route).toBe(t15.route)              // same route …
    expect(t14.query).toEqual({ direction: 'en-de' })   // … different query
    expect(t15.query).toEqual({ direction: 'de-en' })
  })

  it('a band row whose card carries no query leaves query undefined', async () => {
    localStorage.setItem('gt:drillTotals', JSON.stringify({
      'dat-T10': { runs: 1, total: 4, correct: 1, lastAt: 1 }
    }))
    localStorage.setItem('gt:drillTotalsSeeded', '1')
    const row = (await buildTagesplan([])).find(r => r.id === 'band-dat-T10')!
    expect(row.query).toBeUndefined()
  })

  it('a rollup key with no catalogue card is skipped silently', async () => {
    localStorage.setItem('gt:drillTotals', JSON.stringify({
      'dw-T99': { runs: 1, total: 4, correct: 1, lastAt: 1 }
    }))
    localStorage.setItem('gt:drillTotalsSeeded', '1')
    expect((await buildTagesplan([])).filter(r => r.id.startsWith('band-'))).toHaveLength(0)
  })

  it('weak-point rows appear only when history evidence yields scored items', async () => {
    // No history → neither row
    const rows = await buildTagesplan([])
    expect(rows.find(r => r.id === 'schwache-praepositionen')).toBeUndefined()
    expect(rows.find(r => r.id === 'schwache-verben')).toBeUndefined()
  })

  it('weak prepositions become one row naming the top three by score', async () => {
    const rows = await buildTagesplan([prepRun([
      // auf: 2 seen / 2 wrong → score ln(2) ≈ .693 (weakest)
      { prepId: 'auf', prepGerman: 'auf', correct: false, tags: ['case'] },
      { prepId: 'auf', prepGerman: 'auf', correct: false, tags: ['case'] },
      // in: 3 seen / 1 wrong → score ≈ .366
      { prepId: 'in', prepGerman: 'in', correct: false, tags: ['preposition'] },
      { prepId: 'in', prepGerman: 'in', correct: true },
      { prepId: 'in', prepGerman: 'in', correct: true },
      // mit: never missed → score 0, excluded
      { prepId: 'mit', prepGerman: 'mit', correct: true },
      { prepId: 'mit', prepGerman: 'mit', correct: true },
      // über: 1 seen / 1 wrong → weightedScore is 0 (ln(1)), excluded
      { prepId: 'über', prepGerman: 'über', correct: false, tags: ['case'] },
    ])])
    const p = rows.find(r => r.id === 'schwache-praepositionen')!
    expect(p.title).toBe('Präpositionen · Schwache Stellen')
    expect(p.route).toBe('prepositions-remedial')
    expect(p.count).toBe(2)
    expect(p.detail).toBe('auf · in')
    // prep evidence must not leak into the verb row
    expect(rows.find(r => r.id === 'schwache-verben')).toBeUndefined()
  })

  it('weak verbs become one row naming the top three by score', async () => {
    const rows = await buildTagesplan([verbRun([
      // helfen: 2 seen / 2 wrong → score ln(2) ≈ .693 (weakest)
      { verbKeys: ['helfen'], correct: false, tags: ['case'] },
      { verbKeys: ['helfen'], correct: false, tags: ['case'] },
      // gehen: 3 seen / 1 wrong → score ≈ .366
      { verbKeys: ['gehen'], correct: false, tags: ['conjugation'] },
      { verbKeys: ['gehen'], correct: true },
      { verbKeys: ['gehen'], correct: true },
      // sehen: never missed → score 0, excluded
      { verbKeys: ['sehen'], correct: true },
      { verbKeys: ['sehen'], correct: true },
    ])])
    const v = rows.find(r => r.id === 'schwache-verben')!
    expect(v.title).toBe('Verben · Schwache Stellen')
    expect(v.route).toBe('verbs-remedial')
    expect(v.count).toBe(2)
    expect(v.detail).toBe('helfen · gehen')
    expect(rows.find(r => r.id === 'schwache-praepositionen')).toBeUndefined()
  })

  it('section order is korrekturen, dativ, preps, verbs, bands', async () => {
    await appendCorrections([{ ...base }])
    localStorage.setItem(LEDGER_KEY, JSON.stringify({ helfen: { recent: [false], encounters: 1, lastAt: 1 } }))
    localStorage.setItem('gt:drillTotals', JSON.stringify({ 'dat-T10': { runs: 1, total: 4, correct: 1, lastAt: 1 } }))
    localStorage.setItem('gt:drillTotalsSeeded', '1')
    const ids = (await buildTagesplan([])).map(r => r.id)
    expect(ids).toEqual(['korrekturen', 'dativ-wackelig', 'band-dat-T10'])
  })

  it('places the weak rows between Dativ and the bands when every section fires', async () => {
    await appendCorrections([{ ...base }])
    localStorage.setItem(LEDGER_KEY, JSON.stringify({ helfen: { recent: [false], encounters: 1, lastAt: 1 } }))
    localStorage.setItem('gt:drillTotals', JSON.stringify({ 'dat-T10': { runs: 1, total: 4, correct: 1, lastAt: 1 } }))
    localStorage.setItem('gt:drillTotalsSeeded', '1')
    const ids = (await buildTagesplan([
      prepRun([
        { prepId: 'auf', prepGerman: 'auf', correct: false, tags: ['case'] },
        { prepId: 'auf', prepGerman: 'auf', correct: false, tags: ['case'] },
      ]),
      verbRun([
        { verbKeys: ['helfen'], correct: false, tags: ['case'] },
        { verbKeys: ['helfen'], correct: false, tags: ['case'] },
      ]),
    ])).map(r => r.id)
    expect(ids).toEqual([
      'korrekturen', 'dativ-wackelig', 'schwache-praepositionen', 'schwache-verben', 'band-dat-T10'
    ])
  })
})
