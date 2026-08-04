import { describe, expect, it } from 'vitest'
import { db } from '../../src/db'
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
