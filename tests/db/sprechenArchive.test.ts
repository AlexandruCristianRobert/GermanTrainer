import { describe, it, expect, beforeEach, vi } from 'vitest'
import Dexie from 'dexie'
import { db } from '../../src/db'
import {
  appendCorrections,
  listCorrections,
  recordDrillResult,
  scheduleByCorrection,
  openCorrections,
  countsByKind,
  clearArchive,
  type ArchivedCorrection
} from '../../src/composables/useSprechenArchive'

function correctionInput(
  overrides: Partial<Omit<ArchivedCorrection, 'id' | 'createdAt'>> = {}
): Omit<ArchivedCorrection, 'id' | 'createdAt'> {
  return {
    discussionId: 'disc-1',
    topicTitle: 'Tempolimit',
    modality: 'typed',
    kind: 'grammar',
    quote: 'ich habe gegangen',
    suggested: 'ich bin gegangen',
    reasonDe: 'Bewegungsverben bilden das Perfekt mit sein.',
    reasonEn: 'Verbs of motion use sein in the Perfekt.',
    context: 'Ich habe gegangen zur Schule, weil ich spät war.',
    ...overrides
  }
}

describe('sprechenCorrections / sprechenCorrectionEvents (db version 10)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('appends corrections and lists them back', async () => {
    const [row] = await appendCorrections([correctionInput()])
    expect(row.id).toBeTruthy()
    expect(row.createdAt).toBeGreaterThan(0)

    const all = await listCorrections()
    expect(all).toHaveLength(1)
    expect(all[0].quote).toBe('ich habe gegangen')
    expect(all[0].suggested).toBe('ich bin gegangen')
  })

  it('lists newest first', async () => {
    // Mock Date.now() directly rather than vi.useFakeTimers(): fake-indexeddb
    // schedules its own callbacks via real timers, and faking the whole
    // clock stalls those callbacks forever.
    const nowSpy = vi.spyOn(Date, 'now')
    try {
      nowSpy.mockReturnValueOnce(1_000)
      await appendCorrections([correctionInput({ quote: 'first' })])
      nowSpy.mockReturnValueOnce(2_000)
      await appendCorrections([correctionInput({ quote: 'second' })])
      nowSpy.mockReturnValueOnce(3_000)
      await appendCorrections([correctionInput({ quote: 'third' })])
    } finally {
      nowSpy.mockRestore()
    }

    const all = await listCorrections()
    expect(all.map(c => c.quote)).toEqual(['third', 'second', 'first'])
  })

  it('filters by kind', async () => {
    await appendCorrections([
      correctionInput({ kind: 'grammar', quote: 'a' }),
      correctionInput({ kind: 'word-order', quote: 'b' }),
      correctionInput({ kind: 'grammar', quote: 'c' })
    ])

    const grammarOnly = await listCorrections({ kind: 'grammar' })
    expect(grammarOnly).toHaveLength(2)
    expect(grammarOnly.every(c => c.kind === 'grammar')).toBe(true)

    const wordOrderOnly = await listCorrections({ kind: 'word-order' })
    expect(wordOrderOnly).toHaveLength(1)
    expect(wordOrderOnly[0].quote).toBe('b')
  })

  it('respects the limit filter', async () => {
    await appendCorrections([
      correctionInput({ quote: 'a' }),
      correctionInput({ quote: 'b' }),
      correctionInput({ quote: 'c' })
    ])
    const limited = await listCorrections({ limit: 2 })
    expect(limited).toHaveLength(2)
  })

  it('recordDrillResult appends an event WITHOUT mutating the correction row', async () => {
    const [row] = await appendCorrections([correctionInput()])
    const before = await db.sprechenCorrections.get(row.id)
    expect(before).toBeDefined()

    await recordDrillResult(row.id, false)
    await recordDrillResult(row.id, true)

    const after = await db.sprechenCorrections.get(row.id)
    // Deep-compare: the correction row itself must be byte-for-byte identical
    // to before any drill events were recorded — ADR-0012 forbids mutating it.
    expect(after).toEqual(before)

    const events = await db.sprechenCorrectionEvents.where('correctionId').equals(row.id).toArray()
    expect(events).toHaveLength(2)
  })

  // ADR-0025 replaced drilledIds() with per-correction schedules: "drilled"
  // is now the trailing correct streak (>= 1 means re-practised at least
  // once), so these two cases assert `streak` instead of Set membership.
  it('scheduleByCorrection only counts events with correct === true', async () => {
    const [wrongOnly, rightOnly] = await appendCorrections([
      correctionInput({ quote: 'wrong-only' }),
      correctionInput({ quote: 'right-only' })
    ])

    await recordDrillResult(wrongOnly.id, false)
    await recordDrillResult(rightOnly.id, true)

    const schedules = await scheduleByCorrection()
    expect(schedules.get(rightOnly.id)?.streak).toBe(1)
    expect(schedules.get(wrongOnly.id)?.streak).toBe(0)
  })

  it('a correction with one wrong then one right event has a trailing streak of 1', async () => {
    const [row] = await appendCorrections([correctionInput()])
    // Distinct `at` per event: back-to-back recordDrillResult calls land in the
    // same millisecond, and same-`at` events keep the events table's arbitrary
    // primary-key order (see computeSchedule's JSDoc), which would make "the
    // success came last" a coin flip.
    const nowSpy = vi.spyOn(Date, 'now')
    try {
      nowSpy.mockReturnValue(1_000)
      await recordDrillResult(row.id, false)
      nowSpy.mockReturnValue(2_000)
      await recordDrillResult(row.id, true)
    } finally {
      nowSpy.mockRestore()
    }

    // This order still counts as re-practised — the trailing run ends on the
    // success. The REVERSE order (right then wrong) no longer stays retired
    // under ADR-0025: the miss resets the streak and reopens the correction
    // (covered in tests/composables/wiedervorlage.test.ts).
    expect((await scheduleByCorrection()).get(row.id)?.streak).toBe(1)
  })

  it('openCorrections excludes a correction resting after a success (nachgeübt)', async () => {
    const [drilledRow, openRow1, openRow2] = await appendCorrections([
      correctionInput({ quote: 'drilled' }),
      correctionInput({ quote: 'open-1' }),
      correctionInput({ quote: 'open-2' })
    ])
    await recordDrillResult(drilledRow.id, true)

    const open = await openCorrections()
    const openIds = open.map(c => c.id)
    expect(openIds).not.toContain(drilledRow.id)
    expect(openIds).toContain(openRow1.id)
    expect(openIds).toContain(openRow2.id)
    expect(open).toHaveLength(2)
  })

  it('openCorrections respects the limit', async () => {
    await appendCorrections([
      correctionInput({ quote: 'a' }),
      correctionInput({ quote: 'b' }),
      correctionInput({ quote: 'c' })
    ])
    const limited = await openCorrections(1)
    expect(limited).toHaveLength(1)
  })

  it('countsByKind tallies every Sprechen error tag, including zero counts', async () => {
    await appendCorrections([
      correctionInput({ kind: 'grammar' }),
      correctionInput({ kind: 'grammar' }),
      correctionInput({ kind: 'spelling' })
    ])

    const counts = await countsByKind()
    expect(counts).toEqual({
      grammar: 2,
      'word-order': 0,
      vocabulary: 0,
      spelling: 1,
      register: 0
    })
  })

  it('clearArchive wipes both corrections and events', async () => {
    const [row] = await appendCorrections([correctionInput()])
    await recordDrillResult(row.id, true)

    await clearArchive()

    expect(await db.sprechenCorrections.count()).toBe(0)
    expect(await db.sprechenCorrectionEvents.count()).toBe(0)
  })
})

describe('part on archived corrections', () => {
  beforeEach(async () => { await clearArchive() })

  const base = {
    discussionId: 'v-1', topicTitle: 'Ehrenamt', modality: 'typed' as const,
    kind: 'grammar' as const, quote: 'für die Wettkämpfe gefahren',
    suggested: 'zu den Wettkämpfen gefahren', reasonDe: 'Ziel: zu + Dativ.',
    reasonEn: 'Destination takes zu + dative.', context: 'Ich bin für die Wettkämpfe gefahren.'
  }

  it('stores the part it came from', async () => {
    await appendCorrections([{ ...base, part: 1 }])
    const [row] = await listCorrections()
    expect(row.part).toBe(1)
  })

  it('reads a row stored without part as Teil 2, without rewriting it', async () => {
    // ADR-0012: an Archived correction row is never mutated, so there is no
    // backfill — the default happens on read.
    await db.sprechenCorrections.add({ ...base, id: 'legacy-1', createdAt: Date.now() } as any)
    const [row] = await listCorrections()
    expect(row.part).toBe(2)
    const raw = await db.sprechenCorrections.get('legacy-1')
    expect((raw as any).part).toBeUndefined()
  })

  it('filters by part', async () => {
    await appendCorrections([{ ...base, part: 1 }, { ...base, part: 2, quote: 'anders' }])
    expect(await listCorrections({ part: 1 })).toHaveLength(1)
    expect(await listCorrections({ part: 2 })).toHaveLength(1)
    expect(await listCorrections()).toHaveLength(2)
  })

  it('counts by kind per part', async () => {
    await appendCorrections([{ ...base, part: 1 }, { ...base, part: 2, quote: 'anders' }])
    expect((await countsByKind(1)).grammar).toBe(1)
    expect((await countsByKind()).grammar).toBe(2)
  })

  it('serves open corrections from both parts to the drill', async () => {
    await appendCorrections([{ ...base, part: 1 }, { ...base, part: 2, quote: 'anders' }])
    expect(await openCorrections()).toHaveLength(2)
    expect(await openCorrections(undefined, 1)).toHaveLength(1)
  })
})

describe('version 10 migration: modality backfill', () => {
  beforeEach(async () => {
    await db.delete()
  })

  it("sets modality='typed' on a legacy sprechenDiscussions row lacking it", async () => {
    // Simulate an existing install on the pre-modality schema (version 9):
    // open a bare Dexie instance at version 9's stores and insert a row
    // shaped like discussions persisted before `modality` existed.
    const legacy = new Dexie('GermanTrainerDb')
    legacy.version(9).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt'
    })
    await legacy.open()
    await legacy.table('sprechenDiscussions').put({
      id: 'legacy-disc-1',
      topic: {
        id: 'st-umwelt-tempolimit',
        titleDe: 'Tempolimit',
        statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?',
        source: 'seed'
      },
      turnTarget: 6,
      stance: 'pro',
      status: 'in_progress',
      turns: [],
      kiTippCount: 0,
      startedAt: Date.now()
      // no `modality` field — this is the pre-migration shape.
    })
    legacy.close()

    // Reopen through the app's Dexie instance, which runs the version(10) upgrade.
    await db.open()
    const migrated = await db.sprechenDiscussions.get('legacy-disc-1')
    expect(migrated?.modality).toBe('typed')
  })

  it('leaves an already-present modality untouched', async () => {
    const legacy = new Dexie('GermanTrainerDb')
    legacy.version(9).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt'
    })
    await legacy.open()
    await legacy.table('sprechenDiscussions').put({
      id: 'legacy-disc-2',
      topic: {
        id: 'st-x',
        titleDe: 'X',
        statementDe: 'X?',
        source: 'seed'
      },
      turnTarget: 6,
      stance: 'contra',
      modality: 'spoken',
      status: 'in_progress',
      turns: [],
      kiTippCount: 0,
      startedAt: Date.now()
    })
    legacy.close()

    await db.open()
    const migrated = await db.sprechenDiscussions.get('legacy-disc-2')
    expect(migrated?.modality).toBe('spoken')
  })
})
