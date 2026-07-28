// src/composables/useDirectionAssemblyQuiz.ts
//
// Engine for the Direction Words sentence-ASSEMBLY drill (Phase 3 T5):
// reassemble a scrambled German sentence, tile by tile, into any accepted
// order (the canonical order or a curated fronting variant — see
// src/data/directionAssembly.ts). Mirrors useDaAssemblyQuiz.ts, MINUS the
// collocation join — DIRECTION_ASSEMBLY items are authored standalone, so
// this engine pools directly over DwAssemblyItem and filters by level only.
//
// The learner never types a string, so capitalization/spacing can never
// break grading — everything is graded on the tapped INDEX sequence and
// compared against dwAcceptedOrders(item). All-or-nothing per card (every
// tile must land in an accepted order); wrongItems feeds a retry round, same
// precedent as useDaAssemblyQuiz.

import { computed, ref } from 'vue'
import { DIRECTION_ASSEMBLY, dwAcceptedOrders, type DwAssemblyItem } from '../data/directionAssembly'
import { type DirectionLevel } from '../data/directionWords'
import { createPool, shuffle, type FieldMatchers, type Rng } from '../data/pool'

export type DwAssemblyFilter = {
  levels?: DirectionLevel[]
}

const assemblyPool = createPool<DwAssemblyItem, DwAssemblyFilter>(
  DIRECTION_ASSEMBLY,
  {
    levels: i => i.level,
  } satisfies FieldMatchers<DwAssemblyItem, DwAssemblyFilter>
)

/** Items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterDwAssemblyItems(f: DwAssemblyFilter = {}): DwAssemblyItem[] {
  return assemblyPool.filter(f)
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleDwAssemblyItems(count: number, f: DwAssemblyFilter = {}): DwAssemblyItem[] {
  return assemblyPool.sample(count, f)
}

/** One tile in the shuffled pool, carrying its ORIGINAL (canonical-order) index. */
export interface DwAssemblyTile {
  index: number
  tile: string
}

export interface DwAssemblyQuestion {
  item: DwAssemblyItem
  /** Tiles not yet placed, in their (shuffled) display order. */
  pool: DwAssemblyTile[]
  /** Original tile indices, in the order the learner has placed them so far. */
  placed: number[]
  submitted: boolean
  /** Graded verdict, once submitted (all-or-nothing against dwAcceptedOrders). */
  isCorrect: boolean | null
  /** True when the accepted order matched was a variant, not the canonical order. */
  usedVariant: boolean
}

/** Deal a shuffled pool that never spells out an accepted order top-to-bottom (bounded retries). */
function dealPool(item: DwAssemblyItem, rng: Rng): { index: number; tile: string }[] {
  const accepted = dwAcceptedOrders(item).map(o => o.join(','))
  let pool = shuffle(item.tiles.map((tile, index) => ({ index, tile })), item.tiles.length, rng)
  for (let attempt = 0; attempt < 8 && accepted.includes(pool.map(t => t.index).join(',')); attempt++) {
    pool = shuffle(item.tiles.map((tile, index) => ({ index, tile })), item.tiles.length, rng)
  }
  return pool
}

export function useDwAssemblyQuiz(items: DwAssemblyItem[], rng: Rng = Math.random) {
  const questions = ref<DwAssemblyQuestion[]>(items.map(item => ({
    item,
    pool: dealPool(item, rng),
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
  const wrongItems = computed((): DwAssemblyItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
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
   * Grades `placed` against dwAcceptedOrders(item): the canonical order
   * first, then each curated variant. All-or-nothing — every tile must
   * already be placed (guarded by allPlaced), and the whole sequence must
   * match one accepted order exactly. No-op once submitted or before all
   * tiles are placed.
   */
  function submitOrder(): void {
    const q = current.value
    if (!q || q.submitted) return
    if (q.placed.length !== q.item.tiles.length) return
    q.submitted = true
    const orders = dwAcceptedOrders(q.item)
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
