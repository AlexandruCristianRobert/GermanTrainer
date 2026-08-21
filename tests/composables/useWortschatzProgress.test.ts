import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import {
  allVokabeln, readAllProgress, saveProgress, addCustomVokabeln,
  feldSummaries, dueVokabeln, dueVokabelCount, saveExtraSaetze, loadExtraSaetze
} from '../../src/composables/useWortschatzProgress'
import { newProgress, applyOutcome } from '../../src/composables/wortschatzScheduler'
import { WORTSCHATZ_VOKABELN } from '../../src/data/wortschatz'

// applyOutcome is part of the brief's exact import list but unexercised by
// these cases (scheduling itself is covered in wortschatzScheduler.test.ts);
// referenced here only to satisfy noUnusedLocals.
void applyOutcome

const NOW = Date.parse('2026-08-21T10:00:00Z')

beforeEach(async () => {
  await db.wortschatzProgress.clear()
  await db.wortschatzCustom.clear()
  await db.wortschatzSaetze.clear()
})

describe('useWortschatzProgress', () => {
  it('allVokabeln = seeds + custom', async () => {
    const before = (await allVokabeln()).length
    expect(before).toBe(WORTSCHATZ_VOKABELN.length)
    await addCustomVokabeln([{
      id: 'vk-custom-1-0', feld: 'Umwelt', kind: 'einzelwort', de: 'der Test',
      en: 'test', plural: 'Tests', variants: [], source: 'custom',
      saetze: [
        { de: 'Ein {{Test}} läuft.', en: 'A test is running.' },
        { de: 'Der {{Test}} war gut.', en: 'The test was good.' }
      ]
    }])
    expect((await allVokabeln()).length).toBe(before + 1)
  })

  it('progress round-trips through Dexie as plain JSON', async () => {
    const p = newProgress(WORTSCHATZ_VOKABELN[0].id, NOW)
    await saveProgress(p)
    const back = (await readAllProgress()).get(p.vokabelId)
    expect(back).toEqual(p)
  })

  it('feldSummaries counts neu / inArbeit / gefestigt / faellig', async () => {
    const [a, b] = WORTSCHATZ_VOKABELN.filter(v => v.feld === 'Umwelt')
    await saveProgress(newProgress(a.id, NOW))                     // inArbeit + fällig (due=now)
    const done = { ...newProgress(b.id, NOW), gefestigt: true }
    await saveProgress(done)
    const umwelt = (await feldSummaries(NOW)).find(s => s.feld === 'Umwelt')!
    expect(umwelt.gefestigt).toBe(1)
    expect(umwelt.inArbeit).toBe(1)
    expect(umwelt.faellig).toBe(1)
    expect(umwelt.neu).toBe(umwelt.total - 2)
  })

  it('dueVokabeln joins item + progress; gefestigt excluded', async () => {
    const [a, b] = WORTSCHATZ_VOKABELN.filter(v => v.feld === 'Umwelt')
    await saveProgress(newProgress(a.id, NOW))
    await saveProgress({ ...newProgress(b.id, NOW), gefestigt: true })
    const due = await dueVokabeln(NOW)
    expect(due.map(d => d.v.id)).toEqual([a.id])
    expect(await dueVokabelCount(NOW)).toBe(1)
  })

  it('extra sentences round-trip', async () => {
    await saveExtraSaetze('vk-x', [{ de: 'Ein {{Wort}}.', en: 'A word.' }])
    expect((await loadExtraSaetze('vk-x'))).toHaveLength(1)
    expect(await loadExtraSaetze('vk-none')).toEqual([])
  })
})
