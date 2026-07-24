import { describe, test, expect } from 'vitest'
import {
  useDaAssemblyQuiz, joinAssemblyItems, filterAssemblyItems, sampleAssemblyItems,
  ASSEMBLY_PREPS, type AssemblyJoinedItem,
} from '../../src/composables/useDaAssemblyQuiz'
import { DA_ASSEMBLY, assemblySentence, acceptedOrders } from '../../src/data/daAssembly'
import { COLLOCATIONS } from '../../src/data/collocations'

const ALL = joinAssemblyItems()
const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

// A deterministic "no-op" rng: with rng() always returning 0, the partial
// Fisher-Yates in shuffle() swaps i with i (j = i + floor(0 * (n-i)) = i),
// so the pool comes out in the item's original tile order — 0..n-1.
const noShuffle = () => 0

describe('joinAssemblyItems / filterAssemblyItems / sampleAssemblyItems', () => {
  test('joins every assembly item to its collocation', () => {
    expect(ALL.length).toBe(DA_ASSEMBLY.length)
    for (const ji of ALL) expect(ji.colloc.id).toBe(ji.item.collocationId)
  })

  test('filters by level and preposition', () => {
    const b1 = filterAssemblyItems({ levels: ['B1'] })
    expect(b1.length).toBeGreaterThan(0)
    expect(b1.every(ji => ji.colloc.level === 'B1')).toBe(true)

    const auf = filterAssemblyItems({ preps: ['auf'] })
    expect(auf.length).toBeGreaterThan(0)
    expect(auf.every(ji => ji.colloc.preposition === 'auf')).toBe(true)
  })

  test('an empty/omitted filter matches every item', () => {
    expect(filterAssemblyItems({}).length).toBe(ALL.length)
    expect(filterAssemblyItems().length).toBe(ALL.length)
  })

  test('samples at most `count` items matching the filter', () => {
    const sample = sampleAssemblyItems(5, { levels: ['B1'] })
    expect(sample.length).toBe(5)
    expect(sample.every(ji => ji.colloc.level === 'B1')).toBe(true)
  })

  test('ASSEMBLY_PREPS is exactly the distinct prepositions the dataset governs', () => {
    const expected = Array.from(new Set(ALL.map(ji => ji.colloc.preposition))).sort()
    expect(ASSEMBLY_PREPS).toEqual(expected)
  })
})

describe('useDaAssemblyQuiz — initial state', () => {
  test('the pool starts with every tile of the item, shuffled', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji])
    const q = quiz.current.value!
    expect(q.placed).toEqual([])
    expect(q.pool.map(t => t.index).sort((a, b) => a - b))
      .toEqual(ji.item.tiles.map((_, i) => i))
    expect(q.pool.map(t => t.tile).sort())
      .toEqual([...ji.item.tiles].sort())
  })

  test('with a no-op rng the initial pool is in canonical tile order', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    const q = quiz.current.value!
    expect(q.pool).toEqual(ji.item.tiles.map((tile, index) => ({ index, tile })))
  })

  test('allPlaced is false until every tile has been placed', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    expect(quiz.allPlaced.value).toBe(false)
  })
})

describe('useDaAssemblyQuiz — place / unplace', () => {
  test('place moves a tile from pool to the end of placed', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    quiz.place(0)
    expect(quiz.current.value!.placed).toEqual([0])
    expect(quiz.current.value!.pool.map(t => t.index)).toEqual([1, 2, 3])
  })

  test('placing every tile in canonical order makes allPlaced true', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    for (let i = 0; i < ji.item.tiles.length; i++) quiz.place(i)
    expect(quiz.allPlaced.value).toBe(true)
    expect(quiz.current.value!.pool).toEqual([])
  })

  test('placing an index already placed, or not in the pool, is a no-op', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    quiz.place(0)
    quiz.place(0)
    expect(quiz.current.value!.placed).toEqual([0])
    quiz.place(99)
    expect(quiz.current.value!.placed).toEqual([0])
  })

  test('unplace returns the tile at that position to the pool and shifts later positions down', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    quiz.place(0)
    quiz.place(1)
    quiz.place(2)
    quiz.unplace(0)
    expect(quiz.current.value!.placed).toEqual([1, 2])
    expect(quiz.current.value!.pool.some(t => t.index === 0)).toBe(true)
  })

  test('unplace at an out-of-range position is a no-op', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    quiz.place(0)
    quiz.unplace(5)
    expect(quiz.current.value!.placed).toEqual([0])
  })
})

describe('useDaAssemblyQuiz — submitOrder grading', () => {
  test('the canonical order grades correct, with usedVariant false', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    for (let i = 0; i < ji.item.tiles.length; i++) quiz.place(i)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.usedVariant).toBe(false)
  })

  test('a curated variant order grades correct, with usedVariant true', () => {
    // as-warten-auf carries variant [2,1,0,3] ("Schon lange warte ich auf den Bus.")
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    expect(ji.item.variants).toBeTruthy()
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    for (const idx of ji.item.variants![0]) quiz.place(idx)
    quiz.submitOrder()
    expect(quiz.current.value!.placed).toEqual(ji.item.variants![0])
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.usedVariant).toBe(true)
  })

  test('a wrong order grades incorrect', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    // Reverse of canonical — not an accepted order for this item.
    for (const idx of [3, 2, 1, 0]) quiz.place(idx)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(false)
    expect(quiz.current.value!.usedVariant).toBe(false)
  })

  test('submitOrder is a no-op until every tile is placed', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    quiz.place(0)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(null)
  })

  test('once submitted, place and unplace are no-ops (order is locked)', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    for (let i = 0; i < ji.item.tiles.length; i++) quiz.place(i)
    quiz.submitOrder()
    const before = [...quiz.current.value!.placed]
    quiz.unplace(0)
    expect(quiz.current.value!.placed).toEqual(before)
  })

  test('a second submitOrder on an already-graded question is a no-op', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    for (const idx of [3, 2, 1, 0]) quiz.place(idx)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(false)
    // Even if we could re-place the canonical order, submitted is already true.
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(false)
  })

  test('the accepted order can be reconstructed via assemblySentence + acceptedOrders', () => {
    const ji = ALL.find(j => j.item.id === 'as-sich-interessieren-fuer')!
    const orders = acceptedOrders(ji.item)
    expect(orders.length).toBeGreaterThan(1)
    const variant = orders[1]
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    for (const idx of variant) quiz.place(idx)
    quiz.submitOrder()
    expect(quiz.current.value!.isCorrect).toBe(true)
    expect(quiz.current.value!.usedVariant).toBe(true)
    expect(assemblySentence(ji.item, quiz.current.value!.placed))
      .toBe(assemblySentence(ji.item, variant))
  })
})

describe('useDaAssemblyQuiz — advance / score / wrongItems (all-or-nothing per card)', () => {
  test('a wrong card lands in wrongItems once finished, and does not count toward score', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    for (const idx of [3, 2, 1, 0]) quiz.place(idx)
    quiz.submitOrder()
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(0)
    expect(quiz.wrongItems.value.length).toBe(1)
    expect(quiz.wrongItems.value[0].item.id).toBe(ji.item.id)
  })

  test('a correct card does not appear in wrongItems, and score counts it', () => {
    const ji = ALL.find(j => j.item.id === 'as-warten-auf')!
    const quiz = useDaAssemblyQuiz([ji], noShuffle)
    for (let i = 0; i < ji.item.tiles.length; i++) quiz.place(i)
    quiz.submitOrder()
    quiz.advance()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongItems.value).toEqual([])
  })

  test('walks the whole deck via advance and finishes with the right totals', () => {
    const sample = ALL.slice(0, 5)
    const quiz = useDaAssemblyQuiz(sample, noShuffle)
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

// Type-only sanity check: AssemblyJoinedItem shape used across the module.
const _typeCheck: AssemblyJoinedItem = ALL[0]
void _typeCheck
void byId
