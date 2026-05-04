import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import { useNouns } from '../../src/composables/useNouns'
import type { Noun } from '../../src/db/types'

async function addNoun(partial: Partial<Noun>) {
  return db.nouns.add({
    german: 'X',
    gender: 'der',
    english: 'x',
    group: 'Other',
    createdAt: 0,
    ...partial
  } as Noun)
}

describe('useNouns', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('refresh loads all nouns into items, sorted by german', async () => {
    await addNoun({ german: 'Zebra', gender: 'das' })
    await addNoun({ german: 'Apfel', gender: 'der' })
    const { items, refresh } = useNouns()
    await refresh()
    expect(items.value.map(n => n.german)).toEqual(['Apfel', 'Zebra'])
  })

  it('create inserts a new noun and refreshes', async () => {
    const { items, create } = useNouns()
    await create({ german: 'Tisch', gender: 'der', english: 'table', group: 'Furniture' })
    expect(items.value.length).toBe(1)
    expect(items.value[0].german).toBe('Tisch')
  })

  it('update modifies an existing noun', async () => {
    const id = await addNoun({ german: 'Tisch', gender: 'der', english: 'table' })
    const { items, refresh, update } = useNouns()
    await refresh()
    await update(id as number, { english: 'desk' })
    expect(items.value[0].english).toBe('desk')
  })

  it('remove deletes a noun', async () => {
    const id = await addNoun({ german: 'Tisch' })
    const { items, refresh, remove } = useNouns()
    await refresh()
    expect(items.value.length).toBe(1)
    await remove(id as number)
    expect(items.value.length).toBe(0)
  })

  it('sample returns N unique random nouns', async () => {
    for (let i = 0; i < 20; i++) {
      await addNoun({ german: `Word${i}` })
    }
    const { sample } = useNouns()
    const picked = await sample(5)
    expect(picked.length).toBe(5)
    const ids = new Set(picked.map(n => n.id))
    expect(ids.size).toBe(5)
  })

  it('sample caps to available count when N exceeds total', async () => {
    for (let i = 0; i < 3; i++) {
      await addNoun({ german: `Word${i}` })
    }
    const { sample } = useNouns()
    const picked = await sample(10)
    expect(picked.length).toBe(3)
  })

  it('count returns the total number of nouns', async () => {
    for (let i = 0; i < 7; i++) {
      await addNoun({ german: `Word${i}` })
    }
    const { count } = useNouns()
    expect(await count()).toBe(7)
  })
})
