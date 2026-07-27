import { describe, expect, it } from 'vitest'
import type { SprechenDiscussion } from '../../src/data/sprechen'
import {
  buildSprechenGraderPrompt, gradeDiscussion, validateSprechenGrade
} from '../../src/composables/useSprechenGrader'

function disc(): SprechenDiscussion {
  return {
    id: 'd1',
    topic: { id: 'st-umwelt-tempolimit', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?', source: 'seed' },
    turnTarget: 6,
    stance: 'contra',
    status: 'submitted',
    turns: [
      { role: 'partner', textDe: 'Ich bin gegen ein Tempolimit.', at: 1 },
      { role: 'learner', textDe: 'Ich denke das ein Tempolimit gut ist.', at: 2 },
      { role: 'partner', textDe: 'Warum denn?', at: 3 },
      { role: 'learner', textDe: 'Weil es macht die Straßen sicherer.', at: 4 }
    ],
    kiTippCount: 0,
    startedAt: 0
  }
}

function validRaw() {
  return {
    totalScore: 74,
    passes: true,
    criteria: [
      { key: 'erfuellung', score: 20, justificationDe: 'Position klar vertreten.', justificationEn: 'Clear position.' },
      { key: 'kohaerenz', score: 18, justificationDe: 'Meist verbunden.', justificationEn: 'Mostly connected.' },
      { key: 'wortschatz', score: 19, justificationDe: 'Angemessen.', justificationEn: 'Adequate.' },
      { key: 'strukturen', score: 17, justificationDe: 'Verbstellung fehlerhaft.', justificationEn: 'Word-order errors.' }
    ],
    mistakes: [
      {
        turnIndex: 0, quote: 'das ein Tempolimit gut ist', suggested: 'dass ein Tempolimit gut ist',
        kind: 'spelling', reasonDe: '„dass" als Konjunktion.', reasonEn: '"dass" is the conjunction.'
      },
      {
        turnIndex: 1, quote: 'Weil es macht die Straßen sicherer', suggested: 'Weil es die Straßen sicherer macht',
        kind: 'word-order', reasonDe: 'Nebensatz: Verb ans Ende.', reasonEn: 'Subordinate clause: verb final.'
      }
    ],
    strengths: [{ de: 'Reagiert auf den Partner.', en: 'Responds to the partner.' }],
    weaknesses: [{ de: 'Nebensatz-Wortstellung.', en: 'Subordinate word order.' }],
    overallDe: 'Solide, aber Strukturen üben.', overallEn: 'Solid; practice structures.'
  }
}

describe('validateSprechenGrade', () => {
  it('accepts a valid result, re-anchors quotes, computes the Prädikat locally', () => {
    const r = validateSprechenGrade(validRaw(), disc())
    expect(r).not.toBeNull()
    expect(r!.totalScore).toBe(74)
    expect(r!.praedikat).toBe('befriedigend')
    expect(r!.mistakes.length).toBe(2)
    expect(r!.mistakes[0].spanStart).toBeGreaterThanOrEqual(0)
    // span indexes into the LEARNER turn text
    const learnerText = 'Ich denke das ein Tempolimit gut ist.'
    expect(learnerText.slice(r!.mistakes[0].spanStart, r!.mistakes[0].spanEnd)).toBe('das ein Tempolimit gut ist')
  })

  it('rejects when criterion sum ≠ totalScore', () => {
    const raw = validRaw()
    raw.totalScore = 99
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('rejects when passes disagrees with the 60-point threshold', () => {
    const raw = validRaw()
    raw.passes = false
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('rejects wrong criterion keys/order', () => {
    const raw = validRaw()
    raw.criteria[0].key = 'aussprache'
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('rejects out-of-range criterion scores', () => {
    const raw = validRaw()
    raw.criteria[0].score = 26
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('silently drops mistakes whose quote does not re-anchor', () => {
    const raw = validRaw()
    raw.mistakes[0].quote = 'text der nie geschrieben wurde'
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.mistakes.length).toBe(1)
  })

  it('silently drops mistakes with bad kind or out-of-range turnIndex', () => {
    const raw = validRaw()
    ;(raw.mistakes[0] as { kind: string }).kind = 'pronunciation'
    raw.mistakes[1].turnIndex = 7
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.mistakes.length).toBe(0)
  })
})

describe('buildSprechenGraderPrompt', () => {
  it('labels learner turns L0/L1 and embeds the rubric', () => {
    const { system, user } = buildSprechenGraderPrompt(disc())
    expect(user).toContain('L0: Ich denke das ein Tempolimit gut ist.')
    expect(user).toContain('L1: Weil es macht die Straßen sicherer.')
    expect(user).toContain('PARTNER: Warum denn?')
    expect(system).toContain('Erfüllung / Interaktion')
    expect(system).toContain('25')
  })

  it('adds the limited-material caveat below 3 learner turns', () => {
    const { user } = buildSprechenGraderPrompt(disc())
    expect(user).toContain('wenig Material')
  })
})

describe('gradeDiscussion', () => {
  it('retries on invalid payload then succeeds', async () => {
    let call = 0
    const client = {
      models: {
        generateContent: async () => ({
          text: call++ === 0 ? 'garbage' : JSON.stringify(validRaw())
        })
      }
    }
    const r = await gradeDiscussion(client, 'test-model', disc())
    expect(r.totalScore).toBe(74)
    expect(r.modelUsed).toBe('test-model')
  })

  it('throws SprechenGraderError after exhausting retries', async () => {
    const client = { models: { generateContent: async () => ({ text: 'garbage' }) } }
    await expect(gradeDiscussion(client, 'test-model', disc())).rejects.toThrow(/attempts/)
  })
})
