import { describe, expect, it, beforeEach } from 'vitest'
import { db } from '../../src/db'
import {
  createVortrag, findActiveVortrag, saveRede, saveNachfrage, markVortragSubmitted,
  incrementVortragKiTipp, logHelp, abandonVortrag, deleteVortrag
} from '../../src/composables/useVortrag'
import type { VortragHelps, VortragThemaRef } from '../../src/data/sprechen'

const thema: VortragThemaRef = {
  id: 'vt-homeoffice', titleDe: 'Arbeiten von zu Hause',
  taskDe: 'Halten Sie einen kurzen Vortrag darüber, was das Homeoffice mit der Arbeitswelt gemacht hat.',
  source: 'seed'
}
const helps: VortragHelps = { hints: true, checklist: true, kiTipp: true, hardLimit: false }

beforeEach(async () => { await db.sprechenVortraege.clear() })

describe('the Vortrag lifecycle', () => {
  it('creates an in_progress row with the plan and helps frozen', async () => {
    const v = await createVortrag(thema, 'spoken', helps, [{ key: 'fazit', keyword: 'Freistellung' }], 'Notizen')
    expect(v.status).toBe('in_progress')
    expect(v.modality).toBe('spoken')
    expect(v.helps).toEqual(helps)
    expect(v.plan[0].keyword).toBe('Freistellung')
    expect(v.notes).toBe('Notizen')
    expect(v.rede.textDe).toBe('')
    expect(v.kiTippCount).toBe(0)
    expect(v.helpLog).toEqual([])
    expect(await db.sprechenVortraege.get(v.id)).not.toBeUndefined()
  })

  it('finds the most recent active Vortrag, filtered by modality', async () => {
    const typed = await createVortrag(thema, 'typed', helps, [], '')
    await new Promise(r => setTimeout(r, 2))
    const spoken = await createVortrag(thema, 'spoken', helps, [], '')
    expect((await findActiveVortrag())?.id).toBe(spoken.id)
    expect((await findActiveVortrag('typed'))?.id).toBe(typed.id)
  })

  it('returns null when there is nothing active', async () => {
    expect(await findActiveVortrag()).toBeNull()
  })

  it('saves the Rede with its spoken evidence', async () => {
    const v = await createVortrag(thema, 'spoken', helps, [], '')
    await saveRede(v.id, { textDe: 'Ich möchte heute über …', seconds: 231, restarts: 3, spans: [{ text: 'Ich', confidence: 0.9 }] })
    const got = await db.sprechenVortraege.get(v.id)
    expect(got?.rede.textDe).toBe('Ich möchte heute über …')
    expect(got?.rede.seconds).toBe(231)
    expect(got?.rede.restarts).toBe(3)
  })

  it('saves the Nachfrage exchange', async () => {
    const v = await createVortrag(thema, 'typed', helps, [], '')
    await saveNachfrage(v.id, { questionDe: 'Wer soll das bezahlen?', answerDe: 'Beide, denke ich.' })
    expect((await db.sprechenVortraege.get(v.id))?.nachfrage?.answerDe).toBe('Beide, denke ich.')
  })

  it('marks submitted with an endedAt', async () => {
    const v = await createVortrag(thema, 'typed', helps, [], '')
    await markVortragSubmitted(v.id)
    const got = await db.sprechenVortraege.get(v.id)
    expect(got?.status).toBe('submitted')
    expect(got?.endedAt).toBeGreaterThan(0)
  })

  it('counts KI-Tipps', async () => {
    const v = await createVortrag(thema, 'typed', helps, [], '')
    await incrementVortragKiTipp(v.id)
    await incrementVortragKiTipp(v.id)
    expect((await db.sprechenVortraege.get(v.id))?.kiTippCount).toBe(2)
  })

  it('appends to the Hilfe-Protokoll without losing earlier entries', async () => {
    const v = await createVortrag(thema, 'typed', helps, [], '')
    await logHelp(v.id, 'drawer', 1000)
    await logHelp(v.id, 'rettungsleine', 2000)
    const got = await db.sprechenVortraege.get(v.id)
    expect(got?.helpLog).toEqual([
      { at: 1000, kind: 'drawer' },
      { at: 2000, kind: 'rettungsleine' }
    ])
  })

  it('never lets a help-log write break the run', async () => {
    await expect(logHelp('does-not-exist', 'drawer', 1)).resolves.toBeUndefined()
  })

  it('abandon and post-grade delete both remove the row', async () => {
    const a = await createVortrag(thema, 'typed', helps, [], '')
    await abandonVortrag(a.id)
    expect(await db.sprechenVortraege.get(a.id)).toBeUndefined()
    const b = await createVortrag(thema, 'typed', helps, [], '')
    await deleteVortrag(b.id)
    expect(await db.sprechenVortraege.get(b.id)).toBeUndefined()
  })
})
