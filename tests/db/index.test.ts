import { describe, it, expect, beforeEach } from 'vitest'
import { db, seedIfEmpty, resetTableToSeed } from '../../src/db'

describe('db', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('opens with the expected tables', () => {
    expect(db.tables.map(t => t.name).sort()).toEqual(['adjectives', 'nouns', 'settings'])
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
    await db.settings.put({ id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-2.5-flash' })
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
})
