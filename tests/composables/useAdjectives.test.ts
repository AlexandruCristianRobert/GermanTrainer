import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import { useAdjectives } from '../../src/composables/useAdjectives'
import type { Adjective } from '../../src/db/types'

async function addAdj(partial: Partial<Adjective>) {
  return db.adjectives.add({
    german: 'x',
    english: 'x',
    group: 'Other',
    createdAt: 0,
    ...partial
  } as Adjective)
}

describe('useAdjectives', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('refresh loads all adjectives sorted by german', async () => {
    await addAdj({ german: 'zwei' })
    await addAdj({ german: 'alt' })
    const { items, refresh } = useAdjectives()
    await refresh()
    expect(items.value.map(a => a.german)).toEqual(['alt', 'zwei'])
  })

  it('create / update / remove round-trip', async () => {
    const { items, create, update, remove } = useAdjectives()
    const id = await create({ german: 'schön', english: 'beautiful', group: 'Quality & Condition' })
    expect(items.value.length).toBe(1)
    await update(id, { english: 'pretty' })
    expect(items.value[0].english).toBe('pretty')
    await remove(id)
    expect(items.value.length).toBe(0)
  })

  it('sample returns N unique adjectives, capped to available', async () => {
    for (let i = 0; i < 5; i++) await addAdj({ german: `adj${i}` })
    const { sample } = useAdjectives()
    expect((await sample(3)).length).toBe(3)
    expect((await sample(10)).length).toBe(5)
  })

  it('count returns total', async () => {
    for (let i = 0; i < 4; i++) await addAdj({ german: `adj${i}` })
    const { count } = useAdjectives()
    expect(await count()).toBe(4)
  })

  it('sampleByGroups returns only adjectives from the requested groups', async () => {
    await addAdj({ german: 'schön', group: 'Quality & Condition' })
    await addAdj({ german: 'groß', group: 'Size & Quantity' })
    await addAdj({ german: 'klein', group: 'Size & Quantity' })
    await addAdj({ german: 'glücklich', group: 'Feelings & Emotions' })
    const { sampleByGroups } = useAdjectives()
    const picked = await sampleByGroups(['Size & Quantity', 'Feelings & Emotions'], 10)
    const groups = new Set(picked.map(a => a.group))
    expect(picked.length).toBe(3)
    expect(groups.has('Quality & Condition')).toBe(false)
  })

  it('sampleByGroups caps to available count when N exceeds matches', async () => {
    await addAdj({ german: 'schön', group: 'Quality & Condition' })
    await addAdj({ german: 'gut', group: 'Quality & Condition' })
    const { sampleByGroups } = useAdjectives()
    const picked = await sampleByGroups(['Quality & Condition'], 10)
    expect(picked.length).toBe(2)
  })

  it('sampleByGroups returns empty array when groups is empty', async () => {
    await addAdj({ german: 'schön', group: 'Quality & Condition' })
    const { sampleByGroups } = useAdjectives()
    const picked = await sampleByGroups([], 5)
    expect(picked).toEqual([])
  })

  it('countsByGroup returns a count for every ADJECTIVE_GROUPS entry, zero when none', async () => {
    await addAdj({ german: 'schön', group: 'Quality & Condition' })
    await addAdj({ german: 'gut', group: 'Quality & Condition' })
    await addAdj({ german: 'glücklich', group: 'Feelings & Emotions' })
    const { countsByGroup } = useAdjectives()
    const counts = await countsByGroup()
    expect(counts['Quality & Condition']).toBe(2)
    expect(counts['Feelings & Emotions']).toBe(1)
    expect(counts['Time & Sequence']).toBe(0)
    expect(counts['Other']).toBe(0)
  })
})
