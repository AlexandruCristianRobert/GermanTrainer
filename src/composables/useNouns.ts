import { ref } from 'vue'
import { db } from '../db'
import type { Noun, NounGroup } from '../db/types'
import { NOUN_GROUPS } from '../db/types'

export function useNouns() {
  const items = ref<Noun[]>([])

  async function refresh(): Promise<void> {
    items.value = await db.nouns.orderBy('german').toArray()
  }

  async function create(input: Omit<Noun, 'id' | 'createdAt'>): Promise<number> {
    const id = await db.nouns.add({ ...input, createdAt: Date.now() })
    await refresh()
    return id as number
  }

  async function update(id: number, patch: Partial<Omit<Noun, 'id'>>): Promise<void> {
    await db.nouns.update(id, patch)
    await refresh()
  }

  async function remove(id: number): Promise<void> {
    await db.nouns.delete(id)
    await refresh()
  }

  async function count(): Promise<number> {
    return db.nouns.count()
  }

  async function sample(n: number): Promise<Noun[]> {
    const all = await db.nouns.toArray()
    const k = Math.min(n, all.length)
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (all.length - i))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, k)
  }

  async function sampleByGroups(groups: NounGroup[], n: number): Promise<Noun[]> {
    if (groups.length === 0) return []
    const set = new Set(groups)
    const all = (await db.nouns.toArray()).filter(noun => set.has(noun.group))
    const k = Math.min(n, all.length)
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (all.length - i))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, k)
  }

  async function countsByGroup(): Promise<Record<NounGroup, number>> {
    const counts = Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
    const all = await db.nouns.toArray()
    for (const noun of all) {
      counts[noun.group] = (counts[noun.group] ?? 0) + 1
    }
    return counts
  }

  return { items, refresh, create, update, remove, count, sample, sampleByGroups, countsByGroup }
}
