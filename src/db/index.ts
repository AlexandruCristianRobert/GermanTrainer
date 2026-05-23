import Dexie, { type Table } from 'dexie'
import type { Adjective, Noun, Settings } from './types'
import nounsSeed from '../data/nouns.seed.json'
import adjectivesSeed from '../data/adjectives.seed.json'

export class GermanTrainerDb extends Dexie {
  nouns!: Table<Noun, number>
  adjectives!: Table<Adjective, number>
  settings!: Table<Settings, 'singleton'>

  constructor() {
    super('GermanTrainerDb')
    this.version(1).stores({
      nouns: '++id, &german, gender',
      adjectives: '++id, &german',
      settings: 'id'
    })
    this.version(2).stores({
      nouns: '++id, &german, gender',
      adjectives: '++id, &german, group',
      settings: 'id'
    }).upgrade(async tx => {
      await tx.table('adjectives').toCollection().modify(a => {
        if (!a.group) a.group = 'Other'
      })
    })
    this.version(3).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id'
    }).upgrade(async tx => {
      await tx.table('nouns').toCollection().modify(n => {
        if (!n.group) n.group = 'Other'
      })
    })
  }
}

export const db = new GermanTrainerDb()

type NounSeedEntry = Omit<Noun, 'id' | 'createdAt'>

/**
 * Remove entries that share the same `german` key with an earlier entry.
 * The first occurrence wins. Used to keep the seed safe against accidental
 * duplicates introduced by hand-editing the JSON.
 */
export function dedupeNouns<T extends { german: string }>(entries: readonly T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const e of entries) {
    const key = e.german.trim()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

export async function seedIfEmpty(): Promise<void> {
  const now = Date.now()
  if ((await db.nouns.count()) === 0) {
    const fresh = dedupeNouns(nounsSeed as NounSeedEntry[])
    await db.nouns.bulkAdd(fresh.map(n => ({ ...n, createdAt: now })))
  }
  if ((await db.adjectives.count()) === 0) {
    await db.adjectives.bulkAdd(
      (adjectivesSeed as Array<Omit<Adjective, 'id' | 'createdAt'>>).map(a => ({
        ...a,
        createdAt: now
      }))
    )
  }
}

export async function resetTableToSeed(table: 'nouns' | 'adjectives'): Promise<void> {
  const now = Date.now()
  if (table === 'nouns') {
    await db.nouns.clear()
    const fresh = dedupeNouns(nounsSeed as NounSeedEntry[])
    await db.nouns.bulkAdd(fresh.map(n => ({ ...n, createdAt: now })))
  } else {
    await db.adjectives.clear()
    await db.adjectives.bulkAdd(
      (adjectivesSeed as Array<Omit<Adjective, 'id' | 'createdAt'>>).map(a => ({
        ...a,
        createdAt: now
      }))
    )
  }
}
