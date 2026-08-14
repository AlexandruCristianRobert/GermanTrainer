import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const KEY = 'gt:dailyDomainGoal'

// The composable holds module-level singleton state, so every test re-imports
// a fresh copy (same pattern as useTheme.test.ts).
beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** 'YYYY-MM-DD' of the LOCAL calendar day `offset` days from now. */
function localDate(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function stored(): { date: string; count: number } | null {
  const raw = localStorage.getItem(KEY)
  return raw ? JSON.parse(raw) : null
}

async function fresh() {
  const mod = await import('../../src/composables/useDailyDomainGoal')
  return { ...mod.useDailyDomainGoal(), TARGET: mod.DAILY_DOMAIN_GOAL_TARGET }
}

describe('useDailyDomainGoal', () => {
  it('fresh state → count 0 for today', async () => {
    const g = await fresh()
    expect(g.count.value).toBe(0)
    expect(g.done.value).toBe(false)
    g.recordCard()
    expect(stored()).toEqual({ date: localDate(), count: 1 })
  })

  it('recordCard increments and persists', async () => {
    const g = await fresh()
    g.recordCard()
    g.recordCard()
    g.recordCard()
    expect(g.count.value).toBe(3)
    expect(stored()).toEqual({ date: localDate(), count: 3 })
  })

  it('resumes today\'s stored count', async () => {
    localStorage.setItem(KEY, JSON.stringify({ date: localDate(), count: 57 }))
    const g = await fresh()
    expect(g.count.value).toBe(57)
  })

  it('stored entry with yesterday\'s date → count resets on init', async () => {
    localStorage.setItem(KEY, JSON.stringify({ date: localDate(-1), count: 88 }))
    const g = await fresh()
    expect(g.count.value).toBe(0)
    expect(stored()).toEqual({ date: localDate(), count: 0 })
  })

  it('rolls over mid-session when the local day changes (recordCard path)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 14, 23, 50)) // Aug 14, local
    const g = await fresh()
    g.recordCard()
    g.recordCard()
    expect(g.count.value).toBe(2)
    vi.setSystemTime(new Date(2026, 7, 15, 0, 10)) // past local midnight
    g.recordCard()
    expect(g.count.value).toBe(1)
    expect(stored()).toEqual({ date: '2026-08-15', count: 1 })
  })

  it('rolls over on window focus (tab left open overnight)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 14, 22, 0))
    const g = await fresh()
    g.recordCard()
    expect(g.count.value).toBe(1)
    vi.setSystemTime(new Date(2026, 7, 15, 8, 0))
    window.dispatchEvent(new Event('focus'))
    expect(g.count.value).toBe(0)
  })

  it('rolls over on visibilitychange', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 14, 22, 0))
    const g = await fresh()
    g.recordCard()
    vi.setSystemTime(new Date(2026, 7, 15, 8, 0))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(g.count.value).toBe(0)
  })

  it('malformed JSON → safe defaults (today, count 0)', async () => {
    localStorage.setItem(KEY, '{not json!!')
    const g = await fresh()
    expect(g.count.value).toBe(0)
    g.recordCard()
    expect(stored()).toEqual({ date: localDate(), count: 1 })
  })

  it('wrong-shape JSON → safe defaults', async () => {
    localStorage.setItem(KEY, JSON.stringify({ date: 42, count: 'many' }))
    const g = await fresh()
    expect(g.count.value).toBe(0)
  })

  it('done flips at 100', async () => {
    localStorage.setItem(KEY, JSON.stringify({ date: localDate(), count: 99 }))
    const g = await fresh()
    expect(g.TARGET).toBe(100)
    expect(g.done.value).toBe(false)
    g.recordCard()
    expect(g.count.value).toBe(100)
    expect(g.done.value).toBe(true)
  })

  it('is a singleton — two callers share the same count', async () => {
    const mod = await import('../../src/composables/useDailyDomainGoal')
    const a = mod.useDailyDomainGoal()
    const b = mod.useDailyDomainGoal()
    a.recordCard()
    expect(b.count.value).toBe(1)
    expect(a.count).toBe(b.count)
  })

  it('adopts a same-day higher count from another tab (storage event)', async () => {
    const g = await fresh()
    g.recordCard() // 1
    window.dispatchEvent(new StorageEvent('storage', {
      key: KEY,
      newValue: JSON.stringify({ date: localDate(), count: 12 })
    }))
    expect(g.count.value).toBe(12)
  })

  it('ignores stale storage events (older date / lower count / other keys)', async () => {
    localStorage.setItem(KEY, JSON.stringify({ date: localDate(), count: 20 }))
    const g = await fresh()
    window.dispatchEvent(new StorageEvent('storage', {
      key: KEY,
      newValue: JSON.stringify({ date: localDate(-1), count: 99 })
    }))
    expect(g.count.value).toBe(20)
    window.dispatchEvent(new StorageEvent('storage', {
      key: KEY,
      newValue: JSON.stringify({ date: localDate(), count: 5 })
    }))
    expect(g.count.value).toBe(20)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'gt:somethingElse',
      newValue: JSON.stringify({ date: localDate(), count: 99 })
    }))
    expect(g.count.value).toBe(20)
  })

  it('survives a throwing localStorage (private mode) — in-memory counting still works', async () => {
    const g = await fresh()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => g.recordCard()).not.toThrow()
    expect(g.count.value).toBe(1)
  })
})
