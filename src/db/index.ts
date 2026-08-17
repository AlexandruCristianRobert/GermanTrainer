import Dexie, { type Table, type Transaction } from 'dexie'
import type { Adjective, Noun, NounGroup, Settings } from './types'
import type { WritingDraft } from '../data/writingPrompts'
import type { SimulatorSession } from '../data/simulatorC1'
import type { SprechenDiscussion, SprechenVortrag } from '../data/sprechen'
import type { ArchivedCorrection, CorrectionEvent } from '../composables/useSprechenArchive'
import type { CachedArgumentBank } from '../data/sprechenArguments'
import type { CachedSchreibArgumentBank, SchreibenBeitrag } from '../data/schreiben'
import type { CachedNachrichtBaukasten, SchreibenNachricht } from '../data/schreibenNachricht'
import nounsSeed from '../data/nouns.seed.json'
import adjectivesSeed from '../data/adjectives.seed.json'

export class GermanTrainerDb extends Dexie {
  nouns!: Table<Noun, number>
  adjectives!: Table<Adjective, number>
  settings!: Table<Settings, 'singleton'>
  writingDrafts!: Table<WritingDraft, string>
  simulatorSessions!: Table<SimulatorSession, string>
  sprechenDiscussions!: Table<SprechenDiscussion, string>
  // Error archive (ADR-0012) — append-only, see useSprechenArchive.ts.
  sprechenCorrections!: Table<ArchivedCorrection, string>
  sprechenCorrectionEvents!: Table<CorrectionEvent, string>
  sprechenArgumentBanks!: Table<CachedArgumentBank, string>
  /** Teil 1 working state — one in-flight Vortrag at a time (see useVortrag.ts). */
  sprechenVortraege!: Table<SprechenVortrag, string>
  /** Schreiben Teil 1 working state — one in-flight Forumsbeitrag at a time (see useSchreibenBeitrag.ts). */
  schreibenBeitraege!: Table<SchreibenBeitrag, string>
  /** Cached AI-generated argument bank per Schreibthema (see ../data/schreiben). */
  schreibenArgumentBanks!: Table<CachedSchreibArgumentBank, string>
  /** Schreiben Teil 2 working state — one in-flight Nachricht at a time (see useSchreibenNachricht.ts). */
  schreibenNachrichten!: Table<SchreibenNachricht, string>
  /** Cached AI-generated Inhalts-Baukasten per Schreibauftrag (see ../data/schreibenNachricht). */
  schreibenBaukaesten!: Table<CachedNachrichtBaukasten, string>

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
    this.version(7).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt'
    }).upgrade(async tx => {
      // Top up new seed entries (new Fantasy/Switzerland categories + per-category
      // additions) for existing users, who never re-run seedIfEmpty. Same approach
      // as version(4): add missing germans, re-group where the seed changed it,
      // leave user-added nouns untouched.
      await topUpNounsFromSeed(tx)
    })
    this.version(8).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt'
    }).upgrade(async tx => {
      // Top up the new Programming category for existing users, who never re-run
      // seedIfEmpty. Same top-up as version(7): add missing germans, re-group where
      // the seed changed it, leave user-added nouns untouched.
      await topUpNounsFromSeed(tx)
    })
    this.version(9).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt'
    })
    this.version(10).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      // Error archive (ADR-0012): append-only corrections + a separate
      // append-only events table. "Drilled" is derived by joining the two —
      // see useSprechenArchive.ts — never a field on sprechenCorrections.
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      // Cached AI-generated argument bank per topic (see ../data/sprechenArguments).
      sprechenArgumentBanks: 'topicId'
    }).upgrade(async tx => {
      // sprechenDiscussions gained a required `modality` field (typed vs.
      // spoken) after some rows were already persisted. Default legacy rows
      // to 'typed', the only modality that existed before spoken practice
      // shipped.
      await tx.table('sprechenDiscussions').toCollection().modify(d => {
        if (!d.modality) d.modality = 'typed'
      })
    })
    this.version(11).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      sprechenArgumentBanks: 'topicId',
      // Teil 1 working state. Purely additive — no upgrade hook, because no
      // existing row gains a required field.
      sprechenVortraege: '&id, status, startedAt'
    })
    this.version(12).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      sprechenArgumentBanks: 'topicId',
      sprechenVortraege: '&id, status, startedAt'
    }).upgrade(async tx => {
      // Top up the nouns the Sentence module's Fachgebiete reference
      // (ADR-0018 — a Domain's noun list is a reference into this store, so a
      // missing word would silently shrink the Domain). Same top-up as
      // version(8): add missing germans, re-group where the seed changed it,
      // leave user-added nouns untouched.
      await topUpNounsFromSeed(tx)
    })
    this.version(13).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      sprechenArgumentBanks: 'topicId',
      sprechenVortraege: '&id, status, startedAt',
      // Schreiben Teil 1 working state (see useSchreibenBeitrag.ts) plus its
      // cached argument bank. Purely additive — no upgrade hook, because no
      // existing row gains a required field.
      schreibenBeitraege: '&id, status, startedAt',
      schreibenArgumentBanks: 'themaId'
    })
    this.version(14).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      sprechenArgumentBanks: 'topicId',
      sprechenVortraege: '&id, status, startedAt',
      schreibenBeitraege: '&id, status, startedAt',
      schreibenArgumentBanks: 'themaId'
    }).upgrade(async tx => {
      // Top up the new Pharma group plus the Work/Switzerland/Programming
      // additions the Tier 1 Katalog's Domains reference (ADR-0022) — existing
      // users never re-run seedIfEmpty. Same top-up as version(12).
      await topUpNounsFromSeed(tx)
    })
    this.version(15).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      sprechenArgumentBanks: 'topicId',
      sprechenVortraege: '&id, status, startedAt',
      schreibenBeitraege: '&id, status, startedAt',
      schreibenArgumentBanks: 'themaId'
    }).upgrade(async tx => {
      // Top up the Release 2 vocabulary (behavioral/Arbeitsweise/Motivation Work
      // nouns + the remaining technical Programming nouns) the Tier 1 Katalog's
      // new Domains reference (ADR-0022). Same top-up as version(14).
      await topUpNounsFromSeed(tx)
    })
    this.version(16).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt',
      sprechenDiscussions: '&id, status, startedAt',
      sprechenCorrections: '&id, kind, createdAt, topicTitle',
      sprechenCorrectionEvents: '&id, correctionId, at',
      sprechenArgumentBanks: 'topicId',
      sprechenVortraege: '&id, status, startedAt',
      schreibenBeitraege: '&id, status, startedAt',
      schreibenArgumentBanks: 'themaId',
      // Schreiben Teil 2 working state (see useSchreibenNachricht.ts) plus its
      // cached Inhalts-Baukasten. Purely additive — no upgrade hook, because no
      // existing row gains a required field.
      schreibenNachrichten: '&id, status, startedAt',
      schreibenBaukaesten: 'auftragId'
    })
  }
}

/**
 * Shared "top up + re-categorize" migration step used by version(4), (7), (8) and (12).
 * Existing users already have nouns, so seedIfEmpty() never re-runs for them — we
 * have to migrate explicitly when new categories ship. For each seed entry:
 *   - If the german key is missing → add it.
 *   - If it exists but the seed now puts it in a different group → update group.
 * User-added nouns (not in the seed) are left untouched.
 */
async function topUpNounsFromSeed(tx: Transaction): Promise<void> {
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
