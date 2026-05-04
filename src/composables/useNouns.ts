import { ref } from 'vue'
import { db } from '../db'
import type { Noun } from '../db/types'

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

  return { items, refresh, create, update, remove, count, sample }
}
