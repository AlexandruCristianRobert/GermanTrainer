import { describe, it, expect } from 'vitest'
import { useStammformenQuiz } from '../../src/composables/useStammformenQuiz'
import type { Verb } from '../../src/data/verbs'

// ── Verb fixtures ─────────────────────────────────────────────────────────────

const gehen: Verb = {
  german: 'gehen',
  english: 'go / walk',
  level: 'A1',
  type: 'irregular',
  case: 'none',
  auxiliary: 'sein',
  praesens: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'],
  praeteritumStem: 'ging',
  partizip2: 'gegangen',
}

const aufstehen: Verb = {
  german: 'aufstehen',
  english: 'get up / stand up',
  level: 'A1',
  type: 'separable',
  case: 'none',
  auxiliary: 'sein',
  separablePrefix: 'auf',
  praesens: ['stehe auf', 'stehst auf', 'steht auf', 'stehen auf', 'steht auf', 'stehen auf'],
  praeteritumStem: 'stand',
  partizip2: 'aufgestanden',
}

const schlafen: Verb = {
  german: 'schlafen',
  english: 'sleep',
  level: 'A1',
  type: 'irregular',
  case: 'none',
  auxiliary: 'haben',
  praesens: ['schlafe', 'schläfst', 'schläft', 'schlafen', 'schlaft', 'schlafen'],
  praeteritumStem: 'schlief',
  partizip2: 'geschlafen',
}

const lernen: Verb = {
  german: 'lernen',
  english: 'learn',
  level: 'A1',
  type: 'regular',
  case: 'accusative',
  auxiliary: 'haben',
  praesens: ['lerne', 'lernst', 'lernt', 'lernen', 'lernt', 'lernen'],
  praeteritumStem: 'lernte',
  partizip2: 'gelernt',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useStammformenQuiz — basic state', () => {
  it('starts at index 0 and not finished', () => {
    const q = useStammformenQuiz([gehen])
    expect(q.currentIndex.value).toBe(0)
    expect(q.finished.value).toBe(false)
    expect(q.score.value).toBe(0)
    expect(q.total.value).toBe(1)
  })

  it('current reflects the first question', () => {
    const q = useStammformenQuiz([gehen])
    expect(q.current.value?.verb.german).toBe('gehen')
  })

  it('current is null after finishing', () => {
    const q = useStammformenQuiz([gehen])
    q.submit({ praeteritum: 'ging', partizip: 'gegangen', aux: 'sein' })
    q.advance()
    expect(q.current.value).toBeNull()
    expect(q.finished.value).toBe(true)
  })
})

describe('useStammformenQuiz — strong verb (gehen)', () => {
  it('all correct → isCorrect true', () => {
    const q = useStammformenQuiz([gehen])
    q.submit({ praeteritum: 'ging', partizip: 'gegangen', aux: 'sein' })
    const r = q.questions.value[0]
    expect(r.praeteritumOk).toBe(true)
    expect(r.partizipOk).toBe(true)
    expect(r.auxOk).toBe(true)
    expect(r.isCorrect).toBe(true)
  })

  it('score increments for a correct card', () => {
    const q = useStammformenQuiz([gehen])
    q.submit({ praeteritum: 'ging', partizip: 'gegangen', aux: 'sein' })
    q.advance()
    expect(q.score.value).toBe(1)
  })
})

describe('useStammformenQuiz — separable verb (aufstehen)', () => {
  it('accepts "stand auf" for Präteritum er/sie/es and "aufgestanden" for Partizip II', () => {
    const q = useStammformenQuiz([aufstehen])
    // er/sie/es praeteritum for separable verb with stem 'stand' → 'stand auf'
    q.submit({ praeteritum: 'stand auf', partizip: 'aufgestanden', aux: 'sein' })
    const r = q.questions.value[0]
    expect(r.praeteritumOk).toBe(true)
    expect(r.partizipOk).toBe(true)
    expect(r.auxOk).toBe(true)
    expect(r.isCorrect).toBe(true)
  })
})

describe('useStammformenQuiz — umlaut tolerance', () => {
  it('accepts "schlief" with real umlaut', () => {
    const q = useStammformenQuiz([schlafen])
    q.submit({ praeteritum: 'schlief', partizip: 'geschlafen', aux: 'haben' })
    expect(q.questions.value[0].praeteritumOk).toBe(true)
  })

  it('accepts folded form "schlief" typed without umlaut context (direct match)', () => {
    // schlief has no umlauts — this tests it still works as-is
    const q = useStammformenQuiz([schlafen])
    q.submit({ praeteritum: 'Schlief', partizip: 'Geschlafen', aux: 'haben' })
    expect(q.questions.value[0].praeteritumOk).toBe(true)
    expect(q.questions.value[0].partizipOk).toBe(true)
  })
})

describe('useStammformenQuiz — auxiliary grading', () => {
  it('wrong aux → isCorrect false even if praeteritum + partizip correct', () => {
    const q = useStammformenQuiz([gehen])
    q.submit({ praeteritum: 'ging', partizip: 'gegangen', aux: 'haben' }) // wrong aux
    const r = q.questions.value[0]
    expect(r.praeteritumOk).toBe(true)
    expect(r.partizipOk).toBe(true)
    expect(r.auxOk).toBe(false)
    expect(r.isCorrect).toBe(false)
  })

  it('correct aux "haben"', () => {
    const q = useStammformenQuiz([schlafen])
    q.submit({ praeteritum: 'schlief', partizip: 'geschlafen', aux: 'haben' })
    expect(q.questions.value[0].auxOk).toBe(true)
    expect(q.questions.value[0].isCorrect).toBe(true)
  })
})

describe('useStammformenQuiz — all-or-nothing', () => {
  it('wrong praeteritum alone → isCorrect false', () => {
    const q = useStammformenQuiz([gehen])
    q.submit({ praeteritum: 'ginge', partizip: 'gegangen', aux: 'sein' })
    const r = q.questions.value[0]
    expect(r.praeteritumOk).toBe(false)
    expect(r.partizipOk).toBe(true)
    expect(r.auxOk).toBe(true)
    expect(r.isCorrect).toBe(false)
  })

  it('wrong partizip alone → isCorrect false', () => {
    const q = useStammformenQuiz([gehen])
    q.submit({ praeteritum: 'ging', partizip: 'gegehen', aux: 'sein' })
    const r = q.questions.value[0]
    expect(r.praeteritumOk).toBe(true)
    expect(r.partizipOk).toBe(false)
    expect(r.isCorrect).toBe(false)
  })
})

describe('useStammformenQuiz — score and finished', () => {
  it('finished after advancing past last card', () => {
    const q = useStammformenQuiz([gehen, schlafen])
    q.submit({ praeteritum: 'ging', partizip: 'gegangen', aux: 'sein' })
    q.advance()
    expect(q.finished.value).toBe(false)
    q.submit({ praeteritum: 'schlief', partizip: 'geschlafen', aux: 'haben' })
    q.advance()
    expect(q.finished.value).toBe(true)
    expect(q.score.value).toBe(2)
  })

  it('score only counts all-correct cards', () => {
    const q = useStammformenQuiz([gehen, schlafen])
    q.submit({ praeteritum: 'gang', partizip: 'gegangen', aux: 'sein' }) // wrong praeteritum
    q.advance()
    q.submit({ praeteritum: 'schlief', partizip: 'geschlafen', aux: 'haben' })
    q.advance()
    expect(q.score.value).toBe(1)
  })
})

describe('useStammformenQuiz — wrongVerbs', () => {
  it('wrongVerbs contains exactly the failed cards verbs', () => {
    const q = useStammformenQuiz([gehen, schlafen, lernen])
    q.submit({ praeteritum: 'ging', partizip: 'gegangen', aux: 'sein' })   // correct
    q.advance()
    q.submit({ praeteritum: 'schlieft', partizip: 'geschlafen', aux: 'haben' }) // wrong praeteritum
    q.advance()
    q.submit({ praeteritum: 'lernte', partizip: 'gelernt', aux: 'haben' })  // correct
    q.advance()
    const wrong = q.wrongVerbs.value
    expect(wrong).toHaveLength(1)
    expect(wrong[0].german).toBe('schlafen')
  })

  it('wrongVerbs is empty when all correct', () => {
    const q = useStammformenQuiz([gehen])
    q.submit({ praeteritum: 'ging', partizip: 'gegangen', aux: 'sein' })
    q.advance()
    expect(q.wrongVerbs.value).toHaveLength(0)
  })

  it('wrongVerbs excludes unanswered questions (null isCorrect)', () => {
    const q = useStammformenQuiz([gehen, schlafen])
    // Only submit for gehen, not schlafen
    q.submit({ praeteritum: 'gang', partizip: 'gegangen', aux: 'sein' })
    // schlafen never submitted — isCorrect stays null
    const wrong = q.wrongVerbs.value
    // Only gehen (isCorrect === false) should appear
    expect(wrong.map(v => v.german)).toEqual(['gehen'])
  })
})

describe('useStammformenQuiz — question card shape', () => {
  it('expected.praeteritum is the er/sie/es praeteritum form', () => {
    const q = useStammformenQuiz([gehen])
    // conjugate(gehen, 'praeteritum')[2].expected = 'ging'
    expect(q.questions.value[0].expected.praeteritum).toBe('ging')
  })

  it('expected.partizip2 equals verb.partizip2', () => {
    const q = useStammformenQuiz([gehen])
    expect(q.questions.value[0].expected.partizip2).toBe('gegangen')
  })

  it('expected.aux equals verb.auxiliary', () => {
    const q = useStammformenQuiz([gehen])
    expect(q.questions.value[0].expected.aux).toBe('sein')
  })
})
