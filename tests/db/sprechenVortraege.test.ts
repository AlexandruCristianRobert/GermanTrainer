import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { db } from '../../src/db'
import { createVortrag, saveNachfrage, saveRede } from '../../src/composables/useVortrag'
import type { SprechenVortrag } from '../../src/data/sprechen'

function row(id: string): SprechenVortrag {
  return {
    id,
    thema: { id: 'vt-ehrenamt', titleDe: 'Ehrenamtliches Engagement', taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.', source: 'seed' },
    modality: 'typed',
    helps: { hints: true, checklist: true, kiTipp: false, hardLimit: false },
    plan: [{ key: 'einstieg', keyword: 'Sportvereine' }],
    notes: '',
    rede: { textDe: '' },
    kiTippCount: 0,
    helpLog: [],
    status: 'in_progress',
    startedAt: Date.now()
  }
}

describe('sprechenVortraege table (db version 11)', () => {
  it('stores and retrieves a Vortrag row by id', async () => {
    await db.sprechenVortraege.put(row('v-test-1'))
    const got = await db.sprechenVortraege.get('v-test-1')
    expect(got?.thema.titleDe).toBe('Ehrenamtliches Engagement')
    expect(got?.status).toBe('in_progress')
    await db.sprechenVortraege.delete('v-test-1')
  })

  it('indexes status and startedAt', async () => {
    await db.sprechenVortraege.put(row('v-test-2'))
    const byStatus = await db.sprechenVortraege.where('status').equals('in_progress').toArray()
    expect(byStatus.map(r => r.id)).toContain('v-test-2')
    await db.sprechenVortraege.delete('v-test-2')
  })

  it('leaves the Teil 2 tables intact', async () => {
    expect(db.sprechenDiscussions).toBeDefined()
    expect(db.sprechenCorrections).toBeDefined()
    expect(db.sprechenCorrectionEvents).toBeDefined()
    expect(db.sprechenArgumentBanks).toBeDefined()
  })
})

// The runner keeps the whole Vortrag in a `ref`, so everything it reads back
// off `v.value` is a reactive PROXY. IndexedDB stores with the structured
// clone algorithm, which throws DataCloneError on any Proxy — so an unwrapped
// write rejected, and since `commitRede` awaits it inside `finishRede`, the
// "Vortrag beenden" click died silently and the learner could never submit.
// These pin the unwrapping down at the boundary where it belongs.
describe('useVortrag persists reactive state (Vue proxies are not structured-cloneable)', () => {
  it('saveRede accepts a reactive RedeRecord, including proxied span elements', async () => {
    const v = ref(row('v-reactive-1'))
    await db.sprechenVortraege.put(row('v-reactive-1'))

    // Exactly how the runner rebuilds it: spreading a reactive array yields
    // per-ELEMENT proxies, which a shallow toRaw() would leave behind.
    v.value.rede = { ...v.value.rede, textDe: 'Ein Vortrag über das Ehrenamt.', spans: [] }
    v.value.rede = {
      ...v.value.rede,
      spans: [...(v.value.rede.spans ?? []), { text: 'Ein Vortrag', confidence: 0.9 }]
    }

    await expect(saveRede('v-reactive-1', v.value.rede)).resolves.toBeUndefined()
    const got = await db.sprechenVortraege.get('v-reactive-1')
    expect(got?.rede.textDe).toBe('Ein Vortrag über das Ehrenamt.')
    expect(got?.rede.spans).toHaveLength(1)
    expect(got?.rede.spans?.[0].text).toBe('Ein Vortrag')
    await db.sprechenVortraege.delete('v-reactive-1')
  })

  it('saveNachfrage accepts a reactive NachfrageRecord', async () => {
    const v = ref(row('v-reactive-2'))
    await db.sprechenVortraege.put(row('v-reactive-2'))
    v.value.nachfrage = { questionDe: 'Woran messen Sie das?', answerDe: 'An der Zahl der Freiwilligen.' }

    await expect(saveNachfrage('v-reactive-2', v.value.nachfrage)).resolves.toBeUndefined()
    const got = await db.sprechenVortraege.get('v-reactive-2')
    expect(got?.nachfrage?.answerDe).toBe('An der Zahl der Freiwilligen.')
    await db.sprechenVortraege.delete('v-reactive-2')
  })

  it('createVortrag accepts a reactive thema, helps and plan', async () => {
    const src = ref(row('ignored'))
    const created = await createVortrag(
      src.value.thema, 'typed', src.value.helps, src.value.plan, 'meine Notizen'
    )
    const got = await db.sprechenVortraege.get(created.id)
    expect(got?.thema.titleDe).toBe('Ehrenamtliches Engagement')
    expect(got?.plan[0].keyword).toBe('Sportvereine')
    await db.sprechenVortraege.delete(created.id)
  })
})
