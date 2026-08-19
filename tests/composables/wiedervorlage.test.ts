import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  appendCorrections, recordDrillResult, clearArchive,
  computeSchedule, scheduleByCorrection, openCorrections, dueCorrections, drillQueue,
  WIEDERVORLAGE_INTERVALS_DAYS, WIEDERVORLAGE_RETIRE_STREAK,
  type CorrectionEvent, type ArchivedCorrection
} from '../../src/composables/useSprechenArchive'

const DAY = 86_400_000
const ev = (correct: boolean, at: number): CorrectionEvent =>
  ({ id: `e-${at}`, correctionId: 'c-1', correct, at })

describe('computeSchedule (ADR-0025, pure)', () => {
  it('no events → offen, streak 0', () => {
    expect(computeSchedule([], 1000)).toEqual(
      { status: 'offen', streak: 0, lastCorrectAt: null, dueAt: null })
  })
  it('wrong-only events → offen', () => {
    expect(computeSchedule([ev(false, 10)], 1000).status).toBe('offen')
  })
  it('a wrong event resets an earlier success (demotion honesty)', () => {
    const s = computeSchedule([ev(true, 10), ev(false, 20)], 1000)
    expect(s).toEqual({ status: 'offen', streak: 0, lastCorrectAt: null, dueAt: null })
  })
  it('streak 1: rests until day 3, fällig from day 3', () => {
    const events = [ev(true, 0)]
    expect(computeSchedule(events, 3 * DAY - 1)).toEqual(
      { status: 'nachgeuebt', streak: 1, lastCorrectAt: 0, dueAt: 3 * DAY })
    expect(computeSchedule(events, 3 * DAY).status).toBe('faellig')
  })
  it('streak 2 waits 10 days, streak 3 waits 30 days, anchored on the LAST correct event', () => {
    const twoAt5 = [ev(true, 0), ev(true, 5 * DAY)]
    expect(computeSchedule(twoAt5, 5 * DAY + 10 * DAY - 1).status).toBe('nachgeuebt')
    expect(computeSchedule(twoAt5, 5 * DAY + 10 * DAY).status).toBe('faellig')
    const three = [ev(true, 0), ev(true, DAY), ev(true, 2 * DAY)]
    expect(computeSchedule(three, 2 * DAY + 30 * DAY - 1).status).toBe('nachgeuebt')
    expect(computeSchedule(three, 2 * DAY + 30 * DAY).status).toBe('faellig')
  })
  it('streak counts only the TRAILING run: wrong resets, later successes rebuild from 1', () => {
    const s = computeSchedule([ev(true, 0), ev(true, 1), ev(false, 2), ev(true, 3)], 4)
    expect(s.streak).toBe(1)
    expect(s.dueAt).toBe(3 + 3 * DAY)
  })
  it(`retires at streak ${WIEDERVORLAGE_RETIRE_STREAK}: nachgeuebt forever, dueAt null`, () => {
    const four = [ev(true, 0), ev(true, 1), ev(true, 2), ev(true, 3)]
    const s = computeSchedule(four, 400 * DAY)
    expect(s).toEqual({ status: 'nachgeuebt', streak: 4, lastCorrectAt: 3, dueAt: null })
  })
  it('unsorted event input is sorted by at before computing', () => {
    expect(computeSchedule([ev(false, 20), ev(true, 10)], 1000).status).toBe('offen')
    expect(computeSchedule([ev(true, 20), ev(false, 10)], 1000).streak).toBe(1)
  })
  it('interval ladder is exported as documented', () => {
    expect([...WIEDERVORLAGE_INTERVALS_DAYS]).toEqual([3, 10, 30])
  })
})

describe('archive scheduling reads (Dexie round-trip)', () => {
  beforeEach(async () => { await clearArchive() })

  const base: Omit<ArchivedCorrection, 'id' | 'createdAt'> = {
    discussionId: 'd-1', topicTitle: 'Ehrenamt', modality: 'typed',
    kind: 'grammar', quote: 'für die Wettkämpfe', suggested: 'zu den Wettkämpfen',
    reasonDe: 'Ziel: zu + Dativ.', reasonEn: 'Destination takes zu.', context: 'Ich bin für die Wettkämpfe gefahren.'
  }

  it('openCorrections REOPENS an item missed after an old success (the ADR-0025 redefinition)', async () => {
    const [row] = await appendCorrections([base])
    // Distinct `at` per event: back-to-back recordDrillResult calls land in the
    // same millisecond, and same-`at` events keep the events table's arbitrary
    // primary-key order (see computeSchedule's JSDoc), which would make "the
    // miss came last" a coin flip.
    const nowSpy = vi.spyOn(Date, 'now')
    try {
      nowSpy.mockReturnValue(1_000)
      await recordDrillResult(row.id, true)
      nowSpy.mockReturnValue(2_000)
      await recordDrillResult(row.id, false)
    } finally {
      nowSpy.mockRestore()
    }
    const open = await openCorrections()
    expect(open.map(c => c.id)).toEqual([row.id])
  })

  it('a freshly-drilled item is neither open nor due; it appears in scheduleByCorrection as nachgeuebt', async () => {
    const [row] = await appendCorrections([base])
    await recordDrillResult(row.id, true)
    expect(await openCorrections()).toHaveLength(0)
    expect(await dueCorrections()).toHaveLength(0)
    const s = (await scheduleByCorrection()).get(row.id)
    expect(s?.status).toBe('nachgeuebt')
    expect(s?.streak).toBe(1)
  })

  it('dueCorrections returns fällig items most-overdue first, with schedules attached', async () => {
    // dueAt is derived from lastCorrectAt alone — `now` cannot separate two
    // items, it only decides whether each one is fällig yet. So pin the clock
    // and set the two up in OPPOSITE orders: a is the older correction, so
    // listCorrections (newest-first) hands dueCorrections [b, a]; but a
    // succeeded first, so a's dueAt is earlier and a is the more overdue one.
    // Only the dueAt sort can turn [b, a] into [a, b] — delete it and this
    // test fails on every run rather than one in two.
    const nowSpy = vi.spyOn(Date, 'now')
    let a: ArchivedCorrection, b: ArchivedCorrection
    try {
      nowSpy.mockReturnValue(1_000)
      ;[a] = await appendCorrections([{ ...base, quote: 'a' }])
      nowSpy.mockReturnValue(2_000)
      ;[b] = await appendCorrections([{ ...base, quote: 'b' }])
      nowSpy.mockReturnValue(3_000)
      await recordDrillResult(a.id, true)
      nowSpy.mockReturnValue(4_000)
      await recordDrillResult(b.id, true)
    } finally {
      nowSpy.mockRestore()
    }
    const now = 4_000 + 40 * DAY   // both intervals elapsed ⇒ both fällig
    const due = await dueCorrections(undefined, undefined, now)
    expect(due).toHaveLength(2)
    expect(due.every(q => q.schedule.status === 'faellig')).toBe(true)
    expect(due.map(q => q.id)).toEqual([a.id, b.id])
    expect(due[0].schedule.dueAt).toBe(3_000 + 3 * DAY)
    expect(due[1].schedule.dueAt).toBe(4_000 + 3 * DAY)
    expect(due[0].schedule.dueAt!).toBeLessThan(due[1].schedule.dueAt!)
  })

  it('drillQueue serves offen first (newest first), then fällig, and honors the cap', async () => {
    // Distinct createdAt per append — same-ms appends tie under the stable
    // newest-first sort (see tests/db/sprechenArchive.test.ts:50 for why
    // Date.now is spied rather than useFakeTimers).
    const nowSpy = vi.spyOn(Date, 'now')
    let oldOpen: ArchivedCorrection, drilled: ArchivedCorrection, newOpen: ArchivedCorrection
    try {
      nowSpy.mockReturnValue(1_000)
      ;[oldOpen] = await appendCorrections([{ ...base, quote: 'open-old' }])
      nowSpy.mockReturnValue(2_000)
      ;[drilled] = await appendCorrections([{ ...base, quote: 'drilled' }])
      await recordDrillResult(drilled.id, true)
      nowSpy.mockReturnValue(3_000)
      ;[newOpen] = await appendCorrections([{ ...base, quote: 'open-new' }])
    } finally {
      nowSpy.mockRestore()
    }
    const now = 2_000 + 4 * DAY   // 'drilled' is fällig (3-day interval elapsed)
    const q = await drillQueue(undefined, undefined, undefined, now)
    expect(q.map(c => c.id)).toEqual([newOpen.id, oldOpen.id, drilled.id])
    expect(q[2].schedule.status).toBe('faellig')
    expect(await drillQueue(2, undefined, undefined, now)).toHaveLength(2)
  })

  it('drillQueue reserves a quarter of the cap for fällige when offene outnumber it', async () => {
    // Six offene + two fällige against a cap of 4. Without the reserved quota
    // the offene alone would fill every seat and Wiedervorlage would never run;
    // reserved = min(2, floor(4 / 4)) = 1, so exactly one fälliges gets in.
    // Distinct Date.now per write for the same reason as the test above:
    // same-ms appends tie under the stable newest-first sort, and same-`at`
    // events are unordered (see computeSchedule's JSDoc).
    const nowSpy = vi.spyOn(Date, 'now')
    const open: ArchivedCorrection[] = []
    let dueOld: ArchivedCorrection, dueNew: ArchivedCorrection
    try {
      for (let i = 1; i <= 6; i += 1) {
        nowSpy.mockReturnValue(i * 1_000)
        const [row] = await appendCorrections([{ ...base, quote: `open-${i}` }])
        open.push(row)
      }
      nowSpy.mockReturnValue(7_000)
      ;[dueOld] = await appendCorrections([{ ...base, quote: 'due-old' }])
      nowSpy.mockReturnValue(8_000)
      ;[dueNew] = await appendCorrections([{ ...base, quote: 'due-new' }])
      nowSpy.mockReturnValue(9_000)
      await recordDrillResult(dueOld.id, true)   // dueAt 9_000 + 3d — more overdue
      nowSpy.mockReturnValue(10_000)
      await recordDrillResult(dueNew.id, true)   // dueAt 10_000 + 3d
    } finally {
      nowSpy.mockRestore()
    }
    const now = 10_000 + 4 * DAY   // both 3-day intervals elapsed ⇒ both fällig
    const newestOpenFirst = [...open].reverse()

    const capped = await drillQueue(4, undefined, undefined, now)
    expect(capped.map(c => c.id)).toEqual([
      ...newestOpenFirst.slice(0, 3).map(c => c.id),
      dueOld.id
    ])
    expect(capped.slice(0, 3).every(q => q.schedule.status === 'offen')).toBe(true)
    expect(capped[3].schedule.status).toBe('faellig')

    // No cap ⇒ nothing to ration: every offenes, then both fällige.
    const all = await drillQueue(undefined, undefined, undefined, now)
    expect(all.map(c => c.id)).toEqual([
      ...newestOpenFirst.map(c => c.id), dueOld.id, dueNew.id
    ])
  })

  it('module filter flows through drillQueue', async () => {
    await appendCorrections([{ ...base, module: 'sprechen', quote: 's' }, { ...base, module: 'schreiben', quote: 'w' }])
    expect(await drillQueue(undefined, undefined, 'schreiben')).toHaveLength(1)
  })
})
