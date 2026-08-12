import { describe, test, expect } from 'vitest'
import { validateSchreibenGrade, buildSchreibenGraderPrompt } from '../../src/composables/useSchreibenGrader'
import type { SchreibenBeitrag } from '../../src/data/schreiben'

const ESSAY =
  'Meiner Meinung nach ist das Homeoffice eine große Chance. ' +
  'Viele Menschen arbeiten zu Hause produktiver, weil sie weniger unterbrochen werden. ' +
  'Ein Beispiel aus meinem Umfeld zeigt, dass der Arbeitsweg viel Zeit kostet. ' +
  'Natürlich lässt sich einwenden, dass der Kontakt zu Kollegen leidet. ' +
  'Ich habe das Bericht gelesen und finde die Argumente überzeugend. ' +
  'Eine sinnvolle Alternative dazu wäre ein hybrides Modell mit festen Bürotagen. ' +
  'Zusammenfassend lässt sich sagen, dass flexible Regeln allen helfen.'

function mkBeitrag(): SchreibenBeitrag {
  return {
    id: 'b1',
    thema: {
      id: 'wt-homeoffice', titleDe: 'Homeoffice als Normalfall',
      forumContextDe: 'Im Online-Forum „Arbeitswelt heute" wird diskutiert.',
      taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zum Homeoffice.',
      inhaltspunkte: ['Meinung äußern und begründen', 'Vor- oder Nachteile nennen', 'Eigene Erfahrungen', 'Alternative vorschlagen'],
      tags: ['Arbeit']
    },
    helps: { hints: true, checklist: true, kiTipp: true, timer: true },
    plan: [], textDe: ESSAY, status: 'submitted',
    startedAt: 1, updatedAt: 2, kiTippCount: 0, helpLog: []
  }
}

function mkRaw() {
  return {
    criteria: [
      { key: 'erfuellung', score: 21, justificationDe: 'Alle vier Punkte behandelt.', justificationEn: 'All four points covered.' },
      { key: 'kohaerenz', score: 20, justificationDe: 'Klar gegliedert.', justificationEn: 'Clearly structured.' },
      { key: 'wortschatz', score: 19, justificationDe: 'Angemessen.', justificationEn: 'Adequate.' },
      { key: 'strukturen', score: 18, justificationDe: 'Wenige Fehler.', justificationEn: 'Few errors.' }
    ],
    coverage: [
      { index: 0, covered: true, note: 'Meinung klar.' },
      { index: 1, covered: true, note: 'Vorteile genannt.' },
      { index: 2, covered: true, note: 'Beispiel vorhanden.' },
      { index: 3, covered: true, note: 'Hybrides Modell.' }
    ],
    mistakes: [
      { quote: 'das Bericht', suggested: 'den Bericht', kind: 'grammar', reasonDe: 'Der Bericht ist maskulin.', reasonEn: 'Bericht is masculine.' }
    ],
    aufwertungen: [], strengths: [{ de: 'Klare Position.', en: 'Clear stance.' }],
    weaknesses: [{ de: 'Wenig Variation.', en: 'Little variation.' }],
    overallDe: 'Solide.', overallEn: 'Solid.'
  }
}

describe('validateSchreibenGrade', () => {
  test('happy path: derives total/passes/praedikat locally, anchors the mistake', () => {
    const r = validateSchreibenGrade(mkRaw(), mkBeitrag())!
    expect(r.totalScore).toBe(78)
    expect(r.passes).toBe(true)
    expect(r.praedikat).toBe('befriedigend')
    expect(r.mistakes[0].spanStart).toBe(ESSAY.indexOf('das Bericht'))
  })
  test('criteria matched by key, not position', () => {
    const raw = mkRaw()
    raw.criteria.reverse()
    expect(validateSchreibenGrade(raw, mkBeitrag())!.totalScore).toBe(78)
  })
  test('consistency check: ≤2 covered cannot coexist with erfuellung ≥ 20', () => {
    const raw = mkRaw()
    raw.coverage[2].covered = false
    raw.coverage[3].covered = false
    expect(validateSchreibenGrade(raw, mkBeitrag())).toBeNull()
  })
  test('unanchorable mistakes are dropped, not fatal', () => {
    const raw = mkRaw()
    raw.mistakes.push({ quote: 'gibt es hier nicht', suggested: 'x', kind: 'grammar', reasonDe: 'x', reasonEn: 'x' } as any)
    expect(validateSchreibenGrade(raw, mkBeitrag())!.mistakes.length).toBe(1)
  })
  test('spelling mistakes are kept (typed-only module)', () => {
    const raw = mkRaw()
    raw.mistakes[0].kind = 'spelling'
    expect(validateSchreibenGrade(raw, mkBeitrag())!.mistakes[0].kind).toBe('spelling')
  })
  test('score out of range rejects', () => {
    const raw = mkRaw()
    raw.criteria[0].score = 26
    expect(validateSchreibenGrade(raw, mkBeitrag())).toBeNull()
  })
})

describe('buildSchreibenGraderPrompt', () => {
  test('embeds the four Inhaltspunkte, the word floor, the envelope, and the tag enum', () => {
    const { system, user } = buildSchreibenGraderPrompt(mkBeitrag())
    expect(user).toContain('Alternative vorschlagen')
    expect(user).toContain(ESSAY.slice(0, 40))
    expect(system).toContain('mindestens 150')
    expect(system).toContain('"criteria"')
    expect(system).toContain('grammar')
    expect(system).toContain('word-order')
    expect(system).not.toMatch(/```/)
  })
})
