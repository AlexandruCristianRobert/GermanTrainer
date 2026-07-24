// src/composables/useDaAssemblyQuiz.ts
//
// Engine for T16, the Da-Compounds sentence-assembly drill: reassemble a
// scrambled German sentence, tile by tile, into any accepted order (the
// canonical order or a curated fronting variant — see src/data/daAssembly.ts).
// The learner never types a string, so capitalization/spacing can never break
// grading — everything is graded on the tapped INDEX sequence and compared
// against acceptedOrders(item). All-or-nothing per card (every tile must land
// in an accepted order); wrongItems feeds a retry round, same precedent as
// useDaDialogueQuiz.

import { computed, ref } from 'vue'
import { DA_ASSEMBLY, acceptedOrders, type AssemblyItem } from '../data/daAssembly'
import {
  COLLOCATIONS, type Collocation, type CollocationLevel,
} from '../data/collocations'
import { createPool, shuffle, type FieldMatchers, type Rng } from '../data/pool'

/** An assembly item joined to the collocation it references (by `collocationId`). */
export interface AssemblyJoinedItem {
  item: AssemblyItem
  colloc: Collocation
}

const collocationsById = new Map(COLLOCATIONS.map(c => [c.id, c]))

function joinItem(item: AssemblyItem): AssemblyJoinedItem {
  const colloc = collocationsById.get(item.collocationId)
  if (!colloc) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return { item, colloc }
}

/** All DA_ASSEMBLY items, joined to their collocations. */
export function joinAssemblyItems(): AssemblyJoinedItem[] {
  return DA_ASSEMBLY.map(joinItem)
}

/**
 * Every preposition this drill's dataset actually governs — the universe for
 * the prep chip row. Derived from the dataset, not COLLOCATIONS, since not
 * every collocation has an assembly item.
 */
export const ASSEMBLY_PREPS: string[] =
  Array.from(new Set(joinAssemblyItems().map(ji => ji.colloc.preposition))).sort()

export type AssemblyFilter = {
  levels?: CollocationLevel[]
  preps?: string[]
}

const assemblyPool = createPool<AssemblyJoinedItem, AssemblyFilter>(
  joinAssemblyItems(),
  {
    levels: ji => ji.colloc.level,
    preps: ji => ji.colloc.preposition,
  } satisfies FieldMatchers<AssemblyJoinedItem, AssemblyFilter>
)

/** Joined items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterAssemblyItems(f: AssemblyFilter = {}): AssemblyJoinedItem[] {
  return assemblyPool.filter(f)
}

/** A fresh random sample of up to `count` joined items matching the filter. */
export function sampleAssemblyItems(count: number, f: AssemblyFilter = {}): AssemblyJoinedItem[] {
  return assemblyPool.sample(count, f)
}

/** One tile in the shuffled pool, carrying its ORIGINAL (canonical-order) index. */
export interface AssemblyTile {
  index: number
  tile: string
}

export interface AssemblyQuestion extends AssemblyJoinedItem {
  /** Tiles not yet placed, in their (shuffled) display order. */
  pool: AssemblyTile[]
  /** Original tile indices, in the order the learner has placed them so far. */
  placed: number[]
  submitted: boolean
  /** Graded verdict, once submitted (all-or-nothing against acceptedOrders). */
  isCorrect: boolean | null
  /** True when the accepted order matched was a variant, not the canonical order. */
  usedVariant: boolean
}

/** Deal a shuffled pool that never spells out an accepted order top-to-bottom (bounded retries). */
function dealPool(item: AssemblyItem, rng: Rng): { index: number; tile: string }[] {
  const accepted = acceptedOrders(item).map(o => o.join(','))
  let pool = shuffle(item.tiles.map((tile, index) => ({ index, tile })), item.tiles.length, rng)
  for (let attempt = 0; attempt < 8 && accepted.includes(pool.map(t => t.index).join(',')); attempt++) {
    pool = shuffle(item.tiles.map((tile, index) => ({ index, tile })), item.tiles.length, rng)
  }
  return pool
}

export function useDaAssemblyQuiz(items: AssemblyJoinedItem[], rng: Rng = Math.random) {
  const questions = ref<AssemblyQuestion[]>(items.map(ji => ({
    ...ji,
    pool: dealPool(ji.item, rng),
    placed: [],
    submitted: false,
    isCorrect: null,
    usedVariant: false,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): AssemblyJoinedItem[] =>
    questions.value
      .filter(q => q.isCorrect === false)
      .map(q => ({ item: q.item, colloc: q.colloc }))
  )

  const allPlaced = computed(() => {
    const q = current.value
    return !!q && q.placed.length === q.item.tiles.length
  })

  /** Move a pool tile (by its original index) to the end of `placed`. No-op once submitted, or if not in the pool. */
  function place(tileIndex: number): void {
    const q = current.value
    if (!q || q.submitted) return
    const poolPos = q.pool.findIndex(t => t.index === tileIndex)
    if (poolPos < 0) return
    const [tile] = q.pool.splice(poolPos, 1)
    q.placed.push(tile.index)
  }

  /** Return the tile at `placed[position]` to the pool. No-op once submitted, or out of range. */
  function unplace(position: number): void {
    const q = current.value
    if (!q || q.submitted) return
    if (position < 0 || position >= q.placed.length) return
    const [tileIndex] = q.placed.splice(position, 1)
    q.pool.push({ index: tileIndex, tile: q.item.tiles[tileIndex] })
  }

  /**
   * Grades `placed` against acceptedOrders(item): the canonical order first,
   * then each curated variant. All-or-nothing — every tile must already be
   * placed (guarded by allPlaced), and the whole sequence must match one
   * accepted order exactly. No-op once submitted or before all tiles are placed.
   */
  function submitOrder(): void {
    const q = current.value
    if (!q || q.submitted) return
    if (q.placed.length !== q.item.tiles.length) return
    q.submitted = true
    const orders = acceptedOrders(q.item)
    const placedKey = q.placed.join(',')
    const matchIndex = orders.findIndex(o => o.join(',') === placedKey)
    q.isCorrect = matchIndex >= 0
    q.usedVariant = matchIndex > 0
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    allPlaced, place, unplace, submitOrder, advance,
  }
}
