import Dexie, { type Table } from 'dexie'
import type { Adjective, Noun, NounGroup, Settings } from './types'
import type { WritingDraft } from '../data/writingPrompts'
import nounsSeed from '../data/nouns.seed.json'
import adjectivesSeed from '../data/adjectives.seed.json'

// Placeholder shape — replaced by an import from ../data/simulatorC1 in Task 3.
interface SimulatorSessionPlaceholder {
  id: string
  startedAt: number
  endsAt: number
  status: string
  task1PromptId: string
  task1DraftId: string
  task2PromptId: string
  task2DraftId: string
  submittedAt?: number
  gradedAt?: number
  abandonedAt?: number
}

export class GermanTrainerDb extends Dexie {
  nouns!: Table<Noun, number>
  adjectives!: Table<Adjective, number>
  settings!: Table<Settings, 'singleton'>
  writingDrafts!: Table<WritingDraft, string>
  simulatorSessions!: Table<SimulatorSessionPlaceholder, string>

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
    this.version(4).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id'
    }).upgrade(async tx => {
      // Top up + re-categorize. Existing users have nouns, so seedIfEmpty()
      // never re-runs for them — we have to migrate explicitly when new
      // categories ship. For each seed entry:
      //   - If the german key is missing → add it.
      //   - If it exists but the seed now puts it in a different group → update group.
      // User-added nouns (not in the seed) are left untouched.
      const table = tx.table<Noun>('nouns')
      const existing = await table.toArray()
      const byGerman = new Map<string, Noun>()
      for (const n of existing) byGerman.set(n.german, n)

      const now = Date.now()
      const seedDeduped = dedupeNouns(nounsSeed as NounSeedEntry[])
      const toAdd: Array<Omit<Noun, 'id'>> = []
      const toUpdate: Array<{ id: number; group: NounGroup }> = []
      for (const seed of seedDeduped) {
        const current = byGerman.get(seed.german)
        if (!current) {
          toAdd.push({ ...seed, createdAt: now })
        } else if (current.group !== seed.group && current.id != null) {
          toUpdate.push({ id: current.id, group: seed.group })
        }
      }
      if (toAdd.length > 0) await table.bulkAdd(toAdd)
      for (const u of toUpdate) await table.update(u.id, { group: u.group })
    })
    this.version(5).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt'
    })
    this.version(6).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt'
    })
  }
}

export const db = new GermanTrainerDb()

type NounSeedEntry = Omit<Noun, 'id' | 'createdAt'>

/**
 * Remove entries that share the same `german` key.
 * Last-wins: when the key appears multiple times, the LAST entry replaces
 * earlier ones. This lets new seed entries supersede older ones (e.g. a
 * more specific category assignment overwrites a previous "Other").
 * Trimmed comparison so " Tisch " and "Tisch" collide.
 */
export function dedupeNouns<T extends { german: string }>(entries: readonly T[]): T[] {
  const byKey = new Map<string, T>()
  for (const e of entries) {
    byKey.set(e.german.trim(), e)
  }
  return Array.from(byKey.values())
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
