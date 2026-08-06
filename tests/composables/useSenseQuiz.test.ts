import { describe, test, expect } from 'vitest'
import {
  buildSenseDeck,
  checkSenseAnswer,
  explainSenseMiss,
  type SenseCard
} from '../../src/composables/useVerbQuiz'
import type { Verb } from '../../src/data/verbs'
import type { MeaningSenses } from '../../src/data/verb-senses'

function verb(german: string, english: string): Verb {
  return {
    german, english, level: 'A1', type: 'regular', case: 'accusative',
    auxiliary: 'haben', praesens: ['', '', '', '', '', ''], praeteritumStem: '', partizip2: ''
  }
}

const akzeptieren = verb('akzeptieren', 'accept')
const annehmen = verb('annehmen', 'accept / assume')
const anfangen = verb('anfangen', 'begin / start')
const beginnen = verb('beginnen', 'begin')
const schwimmen = verb('schwimmen', 'swim')
const all = [akzeptieren, annehmen, anfangen, beginnen, schwimmen]

const SENSES: readonly MeaningSenses[] = [
  {
    meaning: 'accept',
    senses: [
      { cue: 'an offer, an invitation', verbs: ['annehmen'] },
      { cue: 'a fact you have to live with', verbs: ['akzeptieren'] }
    ]
  },
  {
    meaning: 'begin',
    senses: [{ cue: 'starting to do something', verbs: ['anfangen', 'beginnen'] }]
  },
  {
    meaning: 'start',
    senses: [{ cue: 'starting to do something', verbs: ['anfangen', 'beginnen'] }]
  }
]

describe('buildSenseDeck', () => {
  test('a verb yields one card per sense it carries, plus one plain card for unambiguous alternatives', () => {
    // annehmen: 'accept' is ambiguous (sense card), 'assume' is unique to it (plain card)
    const deck = buildSenseDeck([annehmen], all, SENSES)
    expect(deck).toHaveLength(2)
    const senseCard = deck.find(c => c.cue !== null)!
    expect(senseCard.meaning).toBe('accept')
    expect(senseCard.cue).toBe('an offer, an invitation')
    expect(senseCard.verbs.map(v => v.german)).toEqual(['annehmen'])
    const plain = deck.find(c => c.cue === null)!
    expect(plain.meaning).toBe('assume')
    expect(plain.verbs.map(v => v.german)).toEqual(['annehmen'])
  })

  test('an unambiguous verb yields exactly one plain card with all its alternatives', () => {
    const deck = buildSenseDeck([schwimmen], all, SENSES)
    expect(deck).toEqual([{ meaning: 'swim', cue: null, verbs: [schwimmen] }])
  })

  test('a shared sense appears once however many of its verbs were sampled', () => {
    const deck = buildSenseDeck([anfangen, beginnen], all, SENSES)
    // anfangen: begin-sense + start-sense; beginnen adds nothing new (begin already seen)
    const senseCards = deck.filter(c => c.cue !== null)
    expect(senseCards.map(c => c.meaning).sort()).toEqual(['begin', 'start'])
    for (const c of senseCards) {
      expect(c.verbs.map(v => v.german).sort()).toEqual(['anfangen', 'beginnen'])
    }
    expect(deck.filter(c => c.cue === null)).toHaveLength(0)
  })

  test('an ambiguous meaning with NO authored entry falls back to one lenient card', () => {
    const deck = buildSenseDeck([anfangen, beginnen], all, [])
    const beginCards = deck.filter(c => c.meaning === 'begin')
    expect(beginCards).toHaveLength(1)
    expect(beginCards[0].cue).toBeNull()
    expect(beginCards[0].verbs.map(v => v.german).sort()).toEqual(['anfangen', 'beginnen'])
  })
})

describe('checkSenseAnswer', () => {
  const card: SenseCard = { meaning: 'begin', cue: 'starting to do something', verbs: [anfangen, beginnen] }
  test('any verb of the sense counts, sich-rule and case-insensitivity inherited', () => {
    expect(checkSenseAnswer('beginnen', card)?.german).toBe('beginnen')
    expect(checkSenseAnswer('Anfangen', card)?.german).toBe('anfangen')
    expect(checkSenseAnswer('akzeptieren', card)).toBeNull()
    expect(checkSenseAnswer('', card)).toBeNull()
  })
})

describe('explainSenseMiss', () => {
  const factCard: SenseCard = { meaning: 'accept', cue: 'a fact you have to live with', verbs: [akzeptieren] }
  test('a sibling from another sense of the same meaning is named with its cue', () => {
    const miss = explainSenseMiss('annehmen', factCard, all, SENSES)
    expect(miss).toEqual({ kind: 'sibling', verb: annehmen, cue: 'an offer, an invitation' })
  })
  test('another known verb falls back to kind other', () => {
    const miss = explainSenseMiss('schwimmen', factCard, all, SENSES)
    expect(miss).toEqual({ kind: 'other', verb: schwimmen })
  })
  test('an unknown word is kind unknown', () => {
    expect(explainSenseMiss('blorbieren', factCard, all, SENSES)).toEqual({ kind: 'unknown' })
  })
})
