import { describe, test, expect } from 'vitest'
import { useDwAssemblyQuiz, filterDwAssemblyItems, sampleDwAssemblyItems } from '../../src/composables/useDirectionAssemblyQuiz'
import { DIRECTION_ASSEMBLY, dwAssemblySentence, dwAcceptedOrders } from '../../src/data/directionAssembly'
import type { Rng } from '../../src/data/pool'

// A deterministic "no-op" rng: with rng() always returning 0, the partial
// Fisher-Yates in shuffle() swaps i with i (j = i + floor(0 * (n-i)) = i),
// so the pool comes out in the item's original tile order — 0..n-1.
const noShuffle = () => 0

const treppe = () => DIRECTION_ASSEMBLY.find(i => i.id === 'dwa-treppe-hinunter')!
const omaHinueber = () => DIRECTION_ASSEMBLY.find(i => i.id === 'dwa-oma-hinueber')!

describe('filterDwAssemblyItems / sampleDwAssemblyItems', () => {
  test('filters by level', () => {
    const b1 = filterDwAssemblyItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(i => i.level === 'B1')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterDwAssemblyItems({}).length).toBe(DIRECTION_ASSEMBLY.length)
    expect(filterDwAssemblyItems().length).toBe(DIRECTION_ASSEMBLY.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleDwAssemblyItems(5, { levels: ['B1'] })
    expect(sample.length).toBe(5)
    expect(sample.every(i => i.level === 'B1')).toBe(true)
  })
})

describe('useDwAssemblyQuiz — initial state', () => {
  test('the pool starts with every tile of the item, shuffled', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item])
    const q = quiz.current.value!
    expect(q.placed).toEqual([])
    expect(q.pool.map(t => t.index).sort((a, b) => a - b))
      .toEqual(item.tiles.map((_, i) => i))
    expect(q.pool.map(t => t.tile).sort())
      .toEqual([...item.tiles].sort())
  })

  test('with a no-op rng the initial pool is in canonical tile order', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    const q = quiz.current.value!
    expect(q.pool).toEqual(item.tiles.map((tile, index) => ({ index, tile })))
  })

  test('allPlaced is false until every tile has been placed', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    expect(quiz.allPlaced.value).toBe(false)
  })
})

describe('useDwAssemblyQuiz — place / unplace', () => {
  test('place moves a tile from pool to the end of placed', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    quiz.place(0)
    expect(quiz.current.value!.placed).toEqual([0])
    expect(quiz.current.value!.pool.map(t => t.index)).toEqual([1, 2, 3])
  })

  test('placing every tile in canonical order makes allPlaced true', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    for (let i = 0; i < item.tiles.length; i++) quiz.place(i)
    expect(quiz.allPlaced.value).toBe(true)
    expect(quiz.current.value!.pool).toEqual([])
  })

  test('placing an index already placed, or not in the pool, is a no-op', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    quiz.place(0)
    quiz.place(0)
    expect(quiz.current.value!.placed).toEqual([0])
    quiz.place(99)
    expect(quiz.current.value!.placed).toEqual([0])
  })

  test('unplace returns the tile at that position to the pool and shifts later positions down', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    quiz.place(0)
    quiz.place(1)
    quiz.place(2)
    quiz.unplace(0)
    expect(quiz.current.value!.placed).toEqual([1, 2])
    expect(quiz.current.value!.pool.some(t => t.index === 0)).toBe(true)
  })

  test('unplace at an out-of-range position is a no-op', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    quiz.place(0)
    quiz.unplace(5)
    expect(quiz.current.value!.placed).toEqual([0])
  })
})

describe('useDwAssemblyQuiz — submitOrder grading', () => {
  test('the canonical order grades correct, with usedVariant false', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    for (let i = 0; i < item.tiles.length; i++) quiz.place(i)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.usedVariant).toBe(false)
  })

  test('a curated variant order grades correct, with usedVariant true', () => {
    // dwa-oma-hinueber carries variant [2,1,0,3,4] ("Morgen fahren wir zu Oma hinüber.")
    const item = omaHinueber()
    expect(item.variants).toBeTruthy()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    for (const idx of item.variants![0]) quiz.place(idx)
    quiz.submitOrder()
    expect(quiz.current.value!.placed).toEqual(item.variants![0])
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.usedVariant).toBe(true)
  })

  test('a wrong order grades incorrect', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    // Reverse of canonical — not an accepted order for this item.
    for (const idx of [3, 2, 1, 0]) quiz.place(idx)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(false)
    expect(quiz.current.value!.usedVariant).toBe(false)
  })

  test('submitOrder is a no-op until every tile is placed', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    quiz.place(0)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(null)
  })

  test('once submitted, place and unplace are no-ops (order is locked)', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    for (let i = 0; i < item.tiles.length; i++) quiz.place(i)
    quiz.submitOrder()
    const before = [...quiz.current.value!.placed]
    quiz.unplace(0)
    expect(quiz.current.value!.placed).toEqual(before)
  })

  test('a second submitOrder on an already-graded question is a no-op (double submit)', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    for (const idx of [3, 2, 1, 0]) quiz.place(idx)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(false)
    // Even if we could re-place the canonical order, submitted is already true.
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('the accepted order can be reconstructed via dwAssemblySentence + dwAcceptedOrders', () => {
    const item = omaHinueber()
    const orders = dwAcceptedOrders(item)
    expect(orders.length).toBeGreaterThan(1)
    const variant = orders[1]
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    for (const idx of variant) quiz.place(idx)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.usedVariant).toBe(true)
    expect(dwAssemblySentence(item, quiz.current.value!.placed))
      .toBe(dwAssemblySentence(item, variant))
  })
})

describe('useDwAssemblyQuiz — dealPool 8-retry no-accepted-order guard', () => {
  test('given a rng that reproduces the canonical order on the first draw, the guard retries and escapes to a non-accepted order', () => {
    // A constant () => 0 rng is the identity permutation (proven: j = i +
    // floor(0*(n-i)) = i, so every "shuffle" is a no-op) — it always deals
    // the canonical order, which is itself accepted[0]. Reusing that SAME
    // constant rng across retries can never escape it (it's deterministic),
    // so this rig starts every item off on that guaranteed-accepted identity
    // draw (call < tiles.length → 0), then switches to a rng that produces a
    // genuine non-identity permutation for every retry attempt after — this
    // is what actually exercises the 8-retry guard rather than trivially
    // re-confirming the canonical-deal case already covered above.
    for (const item of DIRECTION_ASSEMBLY) {
      let call = 0
      const rng: Rng = () => (call++ < item.tiles.length ? 0 : 0.99)
      const quiz = useDwAssemblyQuiz([item], rng)
      const dealt = quiz.current.value!.pool.map(t => t.index).join(',')
      const accepted = dwAcceptedOrders(item).map(o => o.join(','))
      expect(accepted).not.toContain(dealt)
    }
  })
})

describe('useDwAssemblyQuiz — advance / score / wrongItems (all-or-nothing per card)', () => {
  test('a wrong card lands in wrongItems once finished, and does not count toward score', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    for (const idx of [3, 2, 1, 0]) quiz.place(idx)
    quiz.submitOrder()
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
    expect(quiz.wrongItems.value[0].id).toBe(item.id)
  })

  test('a correct card does not appear in wrongItems, and score counts it', () => {
    const item = treppe()
    const quiz = useDwAssemblyQuiz([item], noShuffle)
    for (let i = 0; i < item.tiles.length; i++) quiz.place(i)
    quiz.submitOrder()
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([])
  })

  test('walks the whole deck via advance and finishes with the right totals', () => {
    const sample = DIRECTION_ASSEMBLY.slice(0, 5)
    const quiz = useDwAssemblyQuiz(sample, noShuffle)
    for (let n = 0; n < sample.length; n++) {
      const q = quiz.current.value!
      for (let i = 0; i < q.item.tiles.length; i++) quiz.place(i)
      quiz.submitOrder()
      quiz.advance()
    }
    expect(quiz.finished.value).toBe(true)
    expect(quiz.total.value).toBe(5)
    expect(quiz.score.value).toBe(5)
  })
})
