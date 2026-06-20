import { describe, it, expect } from 'vitest'
import { useCaseGovernmentQuiz } from '../../src/composables/useCaseGovernmentQuiz'
import type { Verb } from '../../src/data/verbs'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeVerb(overrides: Partial<Verb> & Pick<Verb, 'german' | 'case'>): Verb {
  return {
    english: 'test',
    level: 'A1',
    type: 'regular',
    auxiliary: 'haben',
    praesens: ['teste', 'testest', 'testet', 'testen', 'testet', 'testen'],
    praeteritumStem: 'testete',
    partizip2: 'getestet',
    ...overrides,
  }
}

const vAccusative = makeVerb({ german: 'sehen', case: 'accusative' })
const vDative     = makeVerb({ german: 'helfen', case: 'dative' })
const vDatAcc     = makeVerb({ german: 'geben', case: 'dative+accusative' })
const vGenitive   = makeVerb({ german: 'gedenken', case: 'genitive' })
const vReflexive  = makeVerb({ german: 'freuen', case: 'reflexive' })
const vNone       = makeVerb({ german: 'schlafen', case: 'none' })
const vVaries     = makeVerb({ german: 'glauben', case: 'varies' })

// ── Basic state ───────────────────────────────────────────────────────────────

describe('useCaseGovernmentQuiz — initial state', () => {
  it('starts at index 0 and not finished', () => {
    const q = useCaseGovernmentQuiz([vAccusative])
    expect(q.currentIndex.value).toBe(0)
    expect(q.finished.value).toBe(false)
    expect(q.score.value).toBe(0)
    expect(q.total.value).toBe(1)
  })

  it('current reflects the first question', () => {
    const q = useCaseGovernmentQuiz([vAccusative])
    expect(q.current.value?.verb.german).toBe('sehen')
    expect(q.current.value?.picked).toBeNull()
    expect(q.current.value?.isCorrect).toBeNull()
  })

  it('current is null and finished after advancing past last card', () => {
    const q = useCaseGovernmentQuiz([vAccusative])
    q.pick('accusative')
    q.advance()
    expect(q.current.value).toBeNull()
    expect(q.finished.value).toBe(true)
  })
})

// ── Correct pick for each of the six determinate cases ───────────────────────

describe('useCaseGovernmentQuiz — correct pick for each case', () => {
  it('accusative: correct pick grades true', () => {
    const q = useCaseGovernmentQuiz([vAccusative])
    q.pick('accusative')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('dative: correct pick grades true', () => {
    const q = useCaseGovernmentQuiz([vDative])
    q.pick('dative')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('dative+accusative: correct pick grades true', () => {
    const q = useCaseGovernmentQuiz([vDatAcc])
    q.pick('dative+accusative')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('genitive: correct pick grades true', () => {
    const q = useCaseGovernmentQuiz([vGenitive])
    q.pick('genitive')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('reflexive: correct pick grades true', () => {
    const q = useCaseGovernmentQuiz([vReflexive])
    q.pick('reflexive')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('none: correct pick grades true', () => {
    const q = useCaseGovernmentQuiz([vNone])
    q.pick('none')
    expect(q.questions.value[0].isCorrect).toBe(true)
  })
})

// ── Incorrect pick ─────────────────────────────────────────────────────────

describe('useCaseGovernmentQuiz — incorrect pick', () => {
  it('wrong pick grades false', () => {
    const q = useCaseGovernmentQuiz([vAccusative])
    q.pick('dative')
    expect(q.questions.value[0].isCorrect).toBe(false)
    expect(q.questions.value[0].picked).toBe('dative')
  })

  it('wrong pick for "none" verb grades false', () => {
    const q = useCaseGovernmentQuiz([vNone])
    q.pick('accusative')
    expect(q.questions.value[0].isCorrect).toBe(false)
  })
})

// ── varies filter ─────────────────────────────────────────────────────────────

describe('useCaseGovernmentQuiz — varies filtering', () => {
  it('filters out verbs with case === "varies"', () => {
    const q = useCaseGovernmentQuiz([vAccusative, vVaries, vDative])
    expect(q.total.value).toBe(2)
    const germans = q.questions.value.map(qu => qu.verb.german)
    expect(germans).not.toContain('glauben')
  })

  it('all verbs are varies → total is 0 and finished immediately', () => {
    const q = useCaseGovernmentQuiz([vVaries])
    expect(q.total.value).toBe(0)
    expect(q.finished.value).toBe(true)
  })

  it('only varies verbs passed in → score is 0', () => {
    const q = useCaseGovernmentQuiz([vVaries])
    expect(q.score.value).toBe(0)
  })
})

// ── score / finished ──────────────────────────────────────────────────────────

describe('useCaseGovernmentQuiz — score and finished', () => {
  it('score increments for correct picks', () => {
    const q = useCaseGovernmentQuiz([vAccusative, vDative])
    q.pick('accusative')
    q.advance()
    q.pick('dative')
    q.advance()
    expect(q.score.value).toBe(2)
    expect(q.finished.value).toBe(true)
  })

  it('score does not count incorrect picks', () => {
    const q = useCaseGovernmentQuiz([vAccusative, vDative])
    q.pick('dative')   // wrong
    q.advance()
    q.pick('dative')   // correct
    q.advance()
    expect(q.score.value).toBe(1)
  })

  it('not finished until past the last card', () => {
    const q = useCaseGovernmentQuiz([vAccusative, vDative])
    q.pick('accusative')
    q.advance()
    expect(q.finished.value).toBe(false)
    q.pick('dative')
    q.advance()
    expect(q.finished.value).toBe(true)
  })
})

// ── wrongVerbs for retry ──────────────────────────────────────────────────────

describe('useCaseGovernmentQuiz — wrongVerbs', () => {
  it('wrongVerbs contains only incorrectly answered verbs', () => {
    const q = useCaseGovernmentQuiz([vAccusative, vDative, vNone])
    q.pick('accusative')  // correct
    q.advance()
    q.pick('accusative')  // wrong (expected dative)
    q.advance()
    q.pick('none')        // correct
    q.advance()
    expect(q.wrongVerbs.value).toHaveLength(1)
    expect(q.wrongVerbs.value[0].german).toBe('helfen')
  })

  it('wrongVerbs is empty when all correct', () => {
    const q = useCaseGovernmentQuiz([vAccusative, vDative])
    q.pick('accusative')
    q.advance()
    q.pick('dative')
    q.advance()
    expect(q.wrongVerbs.value).toHaveLength(0)
  })

  it('wrongVerbs excludes unanswered questions (null isCorrect)', () => {
    const q = useCaseGovernmentQuiz([vAccusative, vDative])
    q.pick('dative')  // wrong
    // vDative never answered
    expect(q.wrongVerbs.value).toHaveLength(1)
    expect(q.wrongVerbs.value[0].german).toBe('sehen')
  })

  it('wrongVerbs excludes "varies" verbs even if they slipped in', () => {
    // Pass a mix — varies should not be in questions at all
    const q = useCaseGovernmentQuiz([vVaries, vAccusative])
    q.pick('dative')  // wrong for sehen
    expect(q.wrongVerbs.value.map(v => v.german)).toEqual(['sehen'])
  })
})
