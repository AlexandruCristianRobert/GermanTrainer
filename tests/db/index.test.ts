import { describe, it, expect, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { db, seedIfEmpty, resetTableToSeed, dedupeNouns } from '../../src/db'

describe('db', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('opens with the expected tables', () => {
    expect(db.tables.map(t => t.name).sort()).toEqual(['adjectives', 'nouns', 'settings', 'simulatorSessions', 'writingDrafts'])
  })

  it('inserts and reads a noun', async () => {
    const id = await db.nouns.add({
      german: 'Tisch',
      gender: 'der',
      english: 'table',
      group: 'Furniture',
      createdAt: Date.now()
    })
    const noun = await db.nouns.get(id)
    expect(noun?.german).toBe('Tisch')
    expect(noun?.gender).toBe('der')
  })

  it('rejects duplicate german words on nouns', async () => {
    await db.nouns.add({ german: 'Tisch', gender: 'der', english: 'table', group: 'Furniture', createdAt: 0 })
    await expect(
      db.nouns.add({ german: 'Tisch', gender: 'das', english: 'desk', group: 'Furniture', createdAt: 0 })
    ).rejects.toThrow()
  })

  it('inserts and reads an adjective', async () => {
    const id = await db.adjectives.add({ german: 'schön', english: 'beautiful', group: 'Quality & Condition', createdAt: 0 })
    const adj = await db.adjectives.get(id)
    expect(adj?.german).toBe('schön')
  })

  it('stores singleton settings row', async () => {
    await db.settings.put({ id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-2.5-flash', aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low' })
    const s = await db.settings.get('singleton')
    expect(s?.geminiApiKey).toBe('AIzaTest')
  })
})

describe('seedIfEmpty', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('seeds nouns and adjectives when tables are empty', async () => {
    await seedIfEmpty()
    const nounCount = await db.nouns.count()
    const adjCount = await db.adjectives.count()
    expect(nounCount).toBeGreaterThan(0)
    expect(adjCount).toBeGreaterThan(0)
  })

  it('is idempotent — second call does not duplicate', async () => {
    await seedIfEmpty()
    const firstCount = await db.nouns.count()
    await seedIfEmpty()
    const secondCount = await db.nouns.count()
    expect(secondCount).toBe(firstCount)
  })

  it('does not seed if user has any entry already', async () => {
    await db.nouns.add({ german: 'CustomNoun', gender: 'der', english: 'custom', group: 'Other', createdAt: 0 })
    await seedIfEmpty()
    expect(await db.nouns.count()).toBe(1)
  })
})

describe('v8 migration tops up Programming nouns', () => {
  beforeEach(async () => {
    await db.delete()
  })

  it('adds Programming nouns to a pre-v8 db on reopen, leaving user-added nouns untouched', async () => {
    // Simulate an existing install on the old schema (pre-Programming): open a
    // Dexie db on version 7's stores, populate it WITHOUT any Programming nouns,
    // and add a user-created noun the seed will never touch.
    const legacy = new Dexie('GermanTrainerDb')
    legacy.version(7).stores({
      nouns: '++id, &german, gender, group',
      adjectives: '++id, &german, group',
      settings: 'id',
      writingDrafts: '&id, promptId, gradedAt, createdAt',
      simulatorSessions: '&id, status, startedAt'
    })
    await legacy.open()
    await legacy.table('nouns').bulkAdd([
      { german: 'Tisch', gender: 'der', english: 'table', group: 'Furniture', createdAt: 0 },
      { german: 'MeinEigenesWort', gender: 'das', english: 'my own word', group: 'Other', createdAt: 0 }
    ])
    const programmingBefore = await legacy
      .table('nouns')
      .where('group')
      .equals('Programming')
      .count()
    expect(programmingBefore).toBe(0)
    legacy.close()

    // Reopen through the app's Dexie instance, which runs the version(8) upgrade.
    await db.open()
    const programmingAfter = await db.nouns.where('group').equals('Programming').count()
    expect(programmingAfter).toBeGreaterThanOrEqual(140)

    // User-added noun survives the top-up.
    const own = await db.nouns.where('german').equals('MeinEigenesWort').first()
    expect(own).toBeDefined()
    expect(own?.group).toBe('Other')
  })
})

describe('dedupeNouns', () => {
  it('keeps the LAST occurrence and drops earlier duplicates by german key', () => {
    const out = dedupeNouns([
      { german: 'Tisch', gender: 'der' },
      { german: 'Stuhl', gender: 'der' },
      { german: 'Tisch', gender: 'das' }
    ])
    // Tisch:das (last) supersedes Tisch:der; Stuhl preserved
    expect(out.find(e => e.german === 'Tisch')).toEqual({ german: 'Tisch', gender: 'das' })
    expect(out.find(e => e.german === 'Stuhl')).toEqual({ german: 'Stuhl', gender: 'der' })
    expect(out).toHaveLength(2)
  })

  it('trims the german key when comparing', () => {
    const out = dedupeNouns([
      { german: 'Tisch' },
      { german: ' Tisch ' }
    ])
    expect(out).toHaveLength(1)
  })

  it('returns empty for empty input', () => {
    expect(dedupeNouns([])).toEqual([])
  })

  it('is idempotent on the bundled noun seed', async () => {
    const seedModule = await import('../../src/data/nouns.seed.json')
    const raw = (seedModule.default ?? seedModule) as Array<{ german: string }>
    const once = dedupeNouns(raw)
    const twice = dedupeNouns(once)
    expect(twice.length).toBe(once.length)
    // sanity: the deduped list is at least as long as can be expected
    expect(once.length).toBeGreaterThan(1000)
  })
})

describe('resetTableToSeed', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('wipes user data and re-seeds nouns', async () => {
    await db.nouns.add({ german: 'CustomNoun', gender: 'der', english: 'custom', group: 'Other', createdAt: 0 })
    expect(await db.nouns.count()).toBe(1)
    await resetTableToSeed('nouns')
    const count = await db.nouns.count()
    expect(count).toBeGreaterThan(1)
    const custom = await db.nouns.where('german').equals('CustomNoun').first()
    expect(custom).toBeUndefined()
  })

  it('after seeding, the new categories have entries', async () => {
    await resetTableToSeed('nouns')
    const bodyHealth = await db.nouns.where('group').equals('Body & Health').count()
    const animals = await db.nouns.where('group').equals('Animals').count()
    const tech = await db.nouns.where('group').equals('Technology').count()
    expect(bodyHealth).toBeGreaterThan(40)
    expect(animals).toBeGreaterThan(40)
    expect(tech).toBeGreaterThan(30)
  })
})
