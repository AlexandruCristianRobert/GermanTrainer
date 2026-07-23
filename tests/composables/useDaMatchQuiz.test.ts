import { describe, test, expect } from 'vitest'
import {
  useDaMatchQuiz, packMatchScreens, sampleMatchCollocations, filterMatchCollocations, MATCH_PREPS,
} from '../../src/composables/useDaMatchQuiz'
import { COLLOCATIONS, type Collocation } from '../../src/data/collocations'
import { daCompound } from '../../src/data/daCompounds'

function makeColloc(id: string, preposition: string): Collocation {
  return {
    id, word: id, english: id, role: 'verb', preposition, case: 'accusative', level: 'B1',
    example: 'x', coreIdeaHint: 'x', coreIdeaExplanation: 'x',
  }
}

describe('packMatchScreens', () => {
  test('packs up to 5 collocations per screen', () => {
    const collocs = ['an', 'auf', 'aus', 'bei', 'durch', 'für'].map((p, i) => makeColloc(`c${i}`, p))
    const screens = packMatchScreens(collocs, 5)
    expect(screens[0]).toHaveLength(5)
    expect(screens[1]).toHaveLength(1)
  })

  test('starts a new screen when a preposition repeats before 5 is reached', () => {
    const collocs = [makeColloc('a', 'an'), makeColloc('b', 'auf'), makeColloc('c', 'an')]
    const screens = packMatchScreens(collocs, 5)
    expect(screens).toHaveLength(2)
    expect(screens[0].map(c => c.id)).toEqual(['a', 'b'])
    expect(screens[1].map(c => c.id)).toEqual(['c'])
  })

  test('every screen has pairwise-distinct prepositions (real dataset)', () => {
    const collocs = COLLOCATIONS.slice(0, 60)
    const screens = packMatchScreens(collocs, 5)
    expect(screens.length).toBeGreaterThan(0)
    for (const screen of screens) {
      const preps = screen.map(c => c.preposition)
      expect(new Set(preps).size).toBe(preps.length)
      expect(screen.length).toBeLessThanOrEqual(5)
    }
  })

  test('walks the input in order — does not reshuffle', () => {
    const collocs = [makeColloc('x', 'an'), makeColloc('y', 'aus'), makeColloc('z', 'bei')]
    const screens = packMatchScreens(collocs, 5)
    expect(screens).toEqual([collocs])
  })

  test('handles empty input', () => {
    expect(packMatchScreens([], 5)).toEqual([])
  })
})

describe('useDaMatchQuiz — screen building', () => {
  test('builds left rows, a shuffled-but-bijective right pool, and empty pairs', () => {
    const collocs = [makeColloc('a', 'an'), makeColloc('b', 'auf')]
    const quiz = useDaMatchQuiz(collocs)
    expect(quiz.total.value).toBe(2)
    expect(quiz.screens.value).toHaveLength(1)
    const screen = quiz.currentScreen.value!
    expect(screen.left.map(l => l.collocId)).toEqual(['a', 'b'])
    expect(screen.right.slice().sort()).toEqual([daCompound('an'), daCompound('auf')].sort())
    expect(screen.pairs.size).toBe(0)
  })

  test('multiple screens when the sample forces a split', () => {
    const collocs = ['an', 'auf', 'aus', 'bei', 'durch', 'für'].map((p, i) => makeColloc(`c${i}`, p))
    const quiz = useDaMatchQuiz(collocs, 5)
    expect(quiz.screens.value).toHaveLength(2)
    expect(quiz.screens.value[0].left).toHaveLength(5)
    expect(quiz.screens.value[1].left).toHaveLength(1)
  })
})

describe('useDaMatchQuiz — assign / unassign / allAssigned', () => {
  test('assign pairs a row to a compound; allAssigned tracks completeness', () => {
    const collocs = [makeColloc('a', 'an'), makeColloc('b', 'auf')]
    const quiz = useDaMatchQuiz(collocs)
    expect(quiz.allAssigned.value).toBe(false)
    quiz.assign('a', daCompound('an'))
    expect(quiz.currentScreen.value!.pairs.get('a')).toBe(daCompound('an'))
    expect(quiz.allAssigned.value).toBe(false)
    quiz.assign('b', daCompound('auf'))
    expect(quiz.allAssigned.value).toBe(true)
  })

  test('unassign clears a pairing', () => {
    const collocs = [makeColloc('a', 'an'), makeColloc('b', 'auf')]
    const quiz = useDaMatchQuiz(collocs)
    quiz.assign('a', daCompound('an'))
    quiz.assign('b', daCompound('auf'))
    quiz.unassign('a')
    expect(quiz.currentScreen.value!.pairs.has('a')).toBe(false)
    expect(quiz.allAssigned.value).toBe(false)
  })

  test('assign is a no-op when the row is already assigned (must unassign first)', () => {
    const collocs = [makeColloc('a', 'an'), makeColloc('b', 'auf')]
    const quiz = useDaMatchQuiz(collocs)
    quiz.assign('a', daCompound('an'))
    quiz.assign('a', daCompound('auf')) // 'a' already has a pairing
    expect(quiz.currentScreen.value!.pairs.get('a')).toBe(daCompound('an'))
  })

  test('assign refuses to double-book a compound already used on this screen', () => {
    const collocs = [makeColloc('a', 'an'), makeColloc('b', 'auf')]
    const quiz = useDaMatchQuiz(collocs)
    quiz.assign('a', daCompound('an'))
    quiz.assign('b', daCompound('an')) // already claimed by 'a'
    expect(quiz.currentScreen.value!.pairs.has('b')).toBe(false)
  })
})

describe('useDaMatchQuiz — submitScreen grading', () => {
  test('grades each pair, feeds score/total, and collects wrongCollocs', () => {
    const collocs = [makeColloc('a', 'an'), makeColloc('b', 'auf'), makeColloc('c', 'aus')]
    const quiz = useDaMatchQuiz(collocs)
    quiz.assign('a', daCompound('an'))   // correct
    quiz.assign('b', daCompound('aus'))  // wrong (swapped with c)
    // 'c' left unassigned entirely -> wrong
    quiz.submitScreen()
    expect(quiz.score.value).toBe(1)
    expect(quiz.total.value).toBe(3)
    expect(quiz.wrongCollocs.value.map(c => c.id).sort()).toEqual(['b', 'c'])
    expect(quiz.currentScreen.value!.submitted).toBe(true)
    expect(quiz.currentScreen.value!.results.get('a')).toBe(true)
    expect(quiz.currentScreen.value!.results.get('b')).toBe(false)
    expect(quiz.currentScreen.value!.results.get('c')).toBe(false)
  })

  test('submitScreen is idempotent — a second call does not re-grade', () => {
    const collocs = [makeColloc('a', 'an')]
    const quiz = useDaMatchQuiz(collocs)
    quiz.assign('a', daCompound('an'))
    quiz.submitScreen()
    quiz.submitScreen()
    expect(quiz.score.value).toBe(1)
    expect(quiz.wrongCollocs.value).toHaveLength(0)
  })

  test('assign/unassign are no-ops after the screen is submitted', () => {
    const collocs = [makeColloc('a', 'an'), makeColloc('b', 'auf')]
    const quiz = useDaMatchQuiz(collocs)
    quiz.assign('a', daCompound('an'))
    quiz.assign('b', daCompound('auf'))
    quiz.submitScreen()
    quiz.unassign('a')
    expect(quiz.currentScreen.value!.pairs.get('a')).toBe(daCompound('an'))
  })
})

describe('useDaMatchQuiz — advanceScreen / finished', () => {
  test('advances through every screen; finished flips true only at the end', () => {
    const collocs = ['an', 'auf', 'aus', 'bei', 'durch', 'für'].map((p, i) => makeColloc(`c${i}`, p))
    const quiz = useDaMatchQuiz(collocs, 5)
    expect(quiz.screens.value).toHaveLength(2)

    quiz.screens.value[0].left.forEach(row => quiz.assign(row.collocId, daCompound(row.preposition)))
    quiz.submitScreen()
    quiz.advanceScreen()
    expect(quiz.finished.value).toBe(false)
    expect(quiz.screenIndex.value).toBe(1)

    quiz.screens.value[1].left.forEach(row => quiz.assign(row.collocId, daCompound(row.preposition)))
    quiz.submitScreen()
    quiz.advanceScreen()
    expect(quiz.finished.value).toBe(true)
    expect(quiz.score.value).toBe(6)
    expect(quiz.total.value).toBe(6)
  })

  test('empty input finishes immediately with total 0', () => {
    const quiz = useDaMatchQuiz([])
    expect(quiz.finished.value).toBe(true)
    expect(quiz.total.value).toBe(0)
    expect(quiz.score.value).toBe(0)
    expect(quiz.currentScreen.value).toBeNull()
  })
})

describe('MATCH_PREPS / filterMatchCollocations / sampleMatchCollocations', () => {
  test('MATCH_PREPS lists every distinct preposition present in COLLOCATIONS', () => {
    expect(MATCH_PREPS.length).toBeGreaterThan(0)
    expect(new Set(MATCH_PREPS)).toEqual(new Set(COLLOCATIONS.map(c => c.preposition)))
  })

  test('every MATCH_PREPS entry can form a da-compound', () => {
    for (const p of MATCH_PREPS) {
      expect(daCompound(p)).toMatch(/^(da|dar)/)
    }
  })

  test('filterMatchCollocations narrows by level/role/prep', () => {
    expect(filterMatchCollocations()).toHaveLength(COLLOCATIONS.length)
    const verbsOnly = filterMatchCollocations({ roles: ['verb'] })
    expect(verbsOnly.length).toBeGreaterThan(0)
    expect(verbsOnly.every(c => c.role === 'verb')).toBe(true)
  })

  test('sampleMatchCollocations returns at most count items matching the filter', () => {
    const sample = sampleMatchCollocations(5, { levels: ['B1'] })
    expect(sample.length).toBeLessThanOrEqual(5)
    expect(sample.every(c => c.level === 'B1')).toBe(true)
  })
})
