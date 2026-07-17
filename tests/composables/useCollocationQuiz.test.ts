import { describe, it, expect } from 'vitest'
import { useCollocationQuiz } from '../../src/composables/useCollocationQuiz'
import type { Collocation } from '../../src/data/collocations'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const wartenAuf: Collocation = {
  id: 'warten-auf',
  word: 'warten',
  english: 'to wait for',
  role: 'verb',
  preposition: 'auf',
  case: 'accusative',
  level: 'B1',
  example: 'Ich warte auf den Bus.',
  coreIdeaHint: 'the bus is late and you keep checking the road',
}

const stolzAuf: Collocation = {
  id: 'stolz-auf',
  word: 'stolz',
  english: 'proud of',
  role: 'adjective',
  preposition: 'auf',
  case: 'accusative',
  level: 'B1',
  example: 'Sie ist stolz auf ihren Sohn.',
  coreIdeaHint: 'she beams with pride at her son',
}

const angstVor: Collocation = {
  id: 'angst-vor',
  word: 'die Angst',
  english: 'fear of',
  role: 'noun',
  preposition: 'vor',
  case: 'dative',
  level: 'B1',
  example: 'Er hat Angst vor Hunden.',
  coreIdeaHint: 'dogs make him freeze on the spot',
}

const teilnehmenAn: Collocation = {
  id: 'teilnehmen-an',
  word: 'teilnehmen',
  english: 'to take part in',
  role: 'verb',
  preposition: 'an',
  case: 'dative',
  level: 'B1',
  example: 'Wir nehmen am Wettbewerb teil.',
  coreIdeaHint: 'we sign up and join the contest',
}

// A collocation with alternatives
const interessiertAn: Collocation = {
  id: 'interessiert-an',
  word: 'interessiert',
  english: 'interested in',
  role: 'adjective',
  preposition: 'an',
  case: 'dative',
  level: 'B1',
  example: 'Sie ist an Musik interessiert.',
  coreIdeaHint: 'music is what grabs her attention',
  alternatives: ['fuer'], // not a real alternative, just for test
}

// ── Basic state ───────────────────────────────────────────────────────────────

describe('useCollocationQuiz — basic state', () => {
  it('starts at index 0, not finished, score 0, total equals items length', () => {
    const q = useCollocationQuiz([wartenAuf, angstVor])
    expect(q.currentIndex.value).toBe(0)
    expect(q.finished.value).toBe(false)
    expect(q.score.value).toBe(0)
    expect(q.total.value).toBe(2)
  })

  it('current reflects the first question', () => {
    const q = useCollocationQuiz([wartenAuf])
    expect(q.current.value?.item.id).toBe('warten-auf')
  })

  it('current is null after advancing past the last card', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'auf', case: 'accusative' })
    q.advance()
    expect(q.current.value).toBeNull()
    expect(q.finished.value).toBe(true)
  })

  it('finished is false until all cards are advanced past', () => {
    const q = useCollocationQuiz([wartenAuf, angstVor])
    q.submit({ preposition: 'auf', case: 'accusative' })
    q.advance()
    expect(q.finished.value).toBe(false)
    q.submit({ preposition: 'vor', case: 'dative' })
    q.advance()
    expect(q.finished.value).toBe(true)
  })
})

// ── Preposition grading ───────────────────────────────────────────────────────

describe('useCollocationQuiz — preposition grading', () => {
  it('exact match → prepositionOk true', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'auf', case: 'accusative' })
    expect(q.questions.value[0].prepositionOk).toBe(true)
  })

  it('wrong preposition → prepositionOk false', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'für', case: 'accusative' })
    expect(q.questions.value[0].prepositionOk).toBe(false)
  })

  it('empty preposition → prepositionOk false', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: '   ', case: 'accusative' })
    expect(q.questions.value[0].prepositionOk).toBe(false)
  })

  it('umlaut-tolerant: "fuer" accepted for "für"', () => {
    const fuerCollocation: Collocation = {
      id: 'danken-fuer',
      word: 'danken',
      english: 'to thank for',
      role: 'verb',
      preposition: 'für',
      case: 'accusative',
      level: 'B1',
      example: 'Ich danke dir für deine Hilfe.',
      coreIdeaHint: 'thanks so much for helping me out',
    }
    const q = useCollocationQuiz([fuerCollocation])
    q.submit({ preposition: 'fuer', case: 'accusative' })
    expect(q.questions.value[0].prepositionOk).toBe(true)
  })

  it('accepts alternative preposition when alternatives array is provided', () => {
    const q = useCollocationQuiz([interessiertAn])
    q.submit({ preposition: 'fuer', case: 'dative' })
    expect(q.questions.value[0].prepositionOk).toBe(true)
  })

  it('case-insensitive match (capital A → auf)', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'Auf', case: 'accusative' })
    expect(q.questions.value[0].prepositionOk).toBe(true)
  })
})

// ── Case grading ─────────────────────────────────────────────────────────────

describe('useCollocationQuiz — case grading', () => {
  it('correct case → caseOk true', () => {
    const q = useCollocationQuiz([angstVor])
    q.submit({ preposition: 'vor', case: 'dative' })
    expect(q.questions.value[0].caseOk).toBe(true)
  })

  it('wrong case → caseOk false', () => {
    const q = useCollocationQuiz([angstVor])
    q.submit({ preposition: 'vor', case: 'accusative' })
    expect(q.questions.value[0].caseOk).toBe(false)
  })

  it('accusative collocation with dative answer → caseOk false', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'auf', case: 'dative' })
    expect(q.questions.value[0].caseOk).toBe(false)
  })
})

// ── All-or-nothing isCorrect ──────────────────────────────────────────────────

describe('useCollocationQuiz — all-or-nothing isCorrect', () => {
  it('both correct → isCorrect true', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'auf', case: 'accusative' })
    expect(q.questions.value[0].isCorrect).toBe(true)
  })

  it('wrong preposition alone → isCorrect false', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'von', case: 'accusative' })
    const r = q.questions.value[0]
    expect(r.prepositionOk).toBe(false)
    expect(r.caseOk).toBe(true)
    expect(r.isCorrect).toBe(false)
  })

  it('wrong case alone → isCorrect false', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'auf', case: 'dative' })
    const r = q.questions.value[0]
    expect(r.prepositionOk).toBe(true)
    expect(r.caseOk).toBe(false)
    expect(r.isCorrect).toBe(false)
  })

  it('both wrong → isCorrect false', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'von', case: 'dative' })
    expect(q.questions.value[0].isCorrect).toBe(false)
  })
})

// ── Score ─────────────────────────────────────────────────────────────────────

describe('useCollocationQuiz — score and finished', () => {
  it('score increments only for fully correct cards', () => {
    const q = useCollocationQuiz([wartenAuf, angstVor])
    q.submit({ preposition: 'auf', case: 'accusative' }) // correct
    q.advance()
    q.submit({ preposition: 'bei', case: 'dative' }) // wrong preposition
    q.advance()
    expect(q.score.value).toBe(1)
    expect(q.finished.value).toBe(true)
  })

  it('perfect score when all correct', () => {
    const q = useCollocationQuiz([wartenAuf, angstVor, teilnehmenAn])
    q.submit({ preposition: 'auf', case: 'accusative' })
    q.advance()
    q.submit({ preposition: 'vor', case: 'dative' })
    q.advance()
    q.submit({ preposition: 'an', case: 'dative' })
    q.advance()
    expect(q.score.value).toBe(3)
  })

  it('score 0 when all wrong', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'zu', case: 'dative' })
    q.advance()
    expect(q.score.value).toBe(0)
  })
})

// ── wrongItems for retry ──────────────────────────────────────────────────────

describe('useCollocationQuiz — wrongItems', () => {
  it('wrongItems contains exactly the failed items', () => {
    const q = useCollocationQuiz([wartenAuf, angstVor, stolzAuf])
    q.submit({ preposition: 'auf', case: 'accusative' }) // correct
    q.advance()
    q.submit({ preposition: 'durch', case: 'dative' }) // wrong preposition
    q.advance()
    q.submit({ preposition: 'auf', case: 'dative' }) // wrong case
    q.advance()
    const wrong = q.wrongItems.value
    expect(wrong).toHaveLength(2)
    expect(wrong.map(i => i.id)).toContain('angst-vor')
    expect(wrong.map(i => i.id)).toContain('stolz-auf')
  })

  it('wrongItems is empty when all correct', () => {
    const q = useCollocationQuiz([wartenAuf])
    q.submit({ preposition: 'auf', case: 'accusative' })
    q.advance()
    expect(q.wrongItems.value).toHaveLength(0)
  })

  it('wrongItems excludes unanswered (null isCorrect) questions', () => {
    const q = useCollocationQuiz([wartenAuf, angstVor])
    q.submit({ preposition: 'fuer', case: 'accusative' }) // wrong
    // angstVor never submitted — stays null
    expect(q.wrongItems.value.map(i => i.id)).toEqual(['warten-auf'])
  })
})

// ── Initial per-part state ────────────────────────────────────────────────────

describe('useCollocationQuiz — initial question state', () => {
  it('all flags start as null before submit', () => {
    const q = useCollocationQuiz([wartenAuf])
    const r = q.questions.value[0]
    expect(r.prepositionOk).toBeNull()
    expect(r.caseOk).toBeNull()
    expect(r.isCorrect).toBeNull()
  })
})
