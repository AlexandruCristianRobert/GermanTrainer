import { describe, it, expect } from 'vitest'
import seed from '../../src/data/nouns.seed.json'
import { NOUN_GROUPS, type Gender } from '../../src/db/types'

type SeedEntry = { german: string; gender: Gender; english: string; group: string }
const entries = seed as SeedEntry[]

describe('nouns.seed.json integrity', () => {
  it('has no duplicate german keys (trimmed)', () => {
    const counts = new Map<string, number>()
    for (const e of entries) counts.set(e.german.trim(), (counts.get(e.german.trim()) ?? 0) + 1)
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k)
    expect(dupes).toEqual([])
  })

  it('every entry has a valid gender', () => {
    const ok = new Set<Gender>(['der', 'die', 'das'])
    const bad = entries.filter(e => !ok.has(e.gender)).map(e => e.german)
    expect(bad).toEqual([])
  })

  it('every entry has a valid group', () => {
    const ok = new Set<string>(NOUN_GROUPS)
    const bad = entries.filter(e => !ok.has(e.group)).map(e => e.german)
    expect(bad).toEqual([])
  })

  it('every entry has a non-empty german and english', () => {
    const bad = entries.filter(e => !e.german?.trim() || !e.english?.trim()).map(e => e.german)
    expect(bad).toEqual([])
  })

  it('has at least 100 Fantasy nouns', () => {
    expect(entries.filter(e => e.group === 'Fantasy').length).toBeGreaterThanOrEqual(100)
  })

  it('has at least 100 Switzerland nouns', () => {
    expect(entries.filter(e => e.group === 'Switzerland').length).toBeGreaterThanOrEqual(100)
  })

  it('every category is well-populated (>= 50 nouns)', () => {
    const counts = new Map<string, number>()
    for (const e of entries) counts.set(e.group, (counts.get(e.group) ?? 0) + 1)
    const thin = NOUN_GROUPS.filter(g => (counts.get(g) ?? 0) < 50)
    expect(thin).toEqual([])
  })
})
