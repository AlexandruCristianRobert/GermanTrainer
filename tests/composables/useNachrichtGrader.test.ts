import { describe, test, expect } from 'vitest'
import { validateNachrichtGrade, buildNachrichtGraderPrompt } from '../../src/composables/useNachrichtGrader'
import { NACHRICHT_MIN_WORDS, type SchreibenNachricht } from '../../src/data/schreibenNachricht'

const NACHRICHT =
  'Betreff: Absage der Besprechung am Freitag\n\n' +
  'Sehr geehrter Herr Semder,\n\n' +
  'vielen Dank für die Einladung zur Team-Besprechung am Freitag. ' +
  'Leider muss ich Ihnen mitteilen, dass ich daran nicht teilnehmen kann. ' +
  'Am selben Tag habe ich einen unaufschiebbaren Arzttermin, den ich schon seit ' +
  'mehreren Monaten vereinbart habe, und das Termin lässt sich leider nicht mehr verschieben. ' +
  'Ich möchte die Inhalte der Besprechung aber unbedingt nachholen. ' +
  'Wäre es möglich, dass wir uns am Montagmorgen kurz zusammensetzen, damit Sie mir ' +
  'die wichtigsten Entscheidungen erläutern können? ' +
  'Außerdem würde ich Sie bitten, mir das Protokoll und die Unterlagen nach der ' +
  'Sitzung zuzuschicken. ' +
  'Für Ihr Verständnis bedanke ich mich im Voraus herzlich.\n\n' +
  'Mit freundlichen Grüßen\n' +
  'Anna Weber'

function mkNachricht(): SchreibenNachricht {
  return {
    id: 'n1',
    auftrag: {
      id: 'wa-besprechung-absagen',
      titleDe: 'Absage einer Besprechung',
      situationDe: 'Ihr Abteilungsleiter, Herr Semder, hat Sie zu einer wichtigen Team-Besprechung am Freitag eingeladen. Am selben Tag haben Sie einen unaufschiebbaren Arzttermin.',
      empfaengerName: 'Herr Semder',
      empfaengerRolleDe: 'Ihr Abteilungsleiter',
      taskDe: 'Schreiben Sie eine Nachricht (mindestens 100 Wörter) an Ihren Abteilungsleiter, Herrn Semder.',
      inhaltspunkte: [
        'Entschuldigen Sie sich höflich, dass Sie nicht an der Besprechung teilnehmen können.',
        'Erklären Sie den Grund für Ihre Absage.',
        'Schlagen Sie vor, wie Sie die Inhalte der Besprechung nachholen können.',
        'Bitten Sie um die Unterlagen oder das Protokoll.'
      ],
      anlass: 'entschuldigung'
    },
    helps: { hints: true, checklist: true, kiTipp: true, timer: true, rahmen: true, radar: true },
    plan: [], textDe: NACHRICHT, status: 'submitted',
    startedAt: 1, updatedAt: 2, kiTippCount: 0, helpLog: []
  }
}

function mkRaw() {
  return {
    criteria: [
      { key: 'erfuellung', score: 21, justificationDe: 'Alle vier Punkte behandelt.', justificationEn: 'All four points covered.' },
      { key: 'kohaerenz', score: 20, justificationDe: 'Klarer Bogen.', justificationEn: 'Clear arc.' },
      { key: 'wortschatz', score: 19, justificationDe: 'Sie-Register gehalten.', justificationEn: 'Sie register held.' },
      { key: 'strukturen', score: 18, justificationDe: 'Wenige Fehler.', justificationEn: 'Few errors.' }
    ],
    coverage: [
      { index: 0, covered: true, note: 'Entschuldigung steht.' },
      { index: 1, covered: true, note: 'Grund genannt.' },
      { index: 2, covered: true, note: 'Ersatztermin vorgeschlagen.' },
      { index: 3, covered: true, note: 'Protokoll erbeten.' }
    ],
    mistakes: [
      { quote: 'das Termin', suggested: 'der Termin', kind: 'grammar', reasonDe: 'Der Termin ist maskulin.', reasonEn: 'Termin is masculine.' }
    ],
    aufwertungen: [] as any[], strengths: [{ de: 'Höflicher Ton.', en: 'Polite tone.' }],
    weaknesses: [{ de: 'Wenig Variation.', en: 'Little variation.' }],
    overallDe: 'Solide.', overallEn: 'Solid.'
  }
}

describe('validateNachrichtGrade', () => {
  test('happy path: derives total/passes/praedikat locally, anchors the mistake', () => {
    const r = validateNachrichtGrade(mkRaw(), mkNachricht())!
    expect(r.totalScore).toBe(78)
    expect(r.passes).toBe(true)
    expect(r.praedikat).toBe('befriedigend')
    expect(r.mistakes[0].spanStart).toBe(NACHRICHT.indexOf('das Termin'))
  })
  test('coverage cells carry the Auftrag\'s own Inhaltspunkte in task-sheet order', () => {
    const r = validateNachrichtGrade(mkRaw(), mkNachricht())!
    expect(r.coverage.length).toBe(4)
    expect(r.coverage.map(c => c.index)).toEqual([0, 1, 2, 3])
    expect(r.coverage[3].punkt).toBe('Bitten Sie um die Unterlagen oder das Protokoll.')
  })
  test('criteria matched by key, not position', () => {
    const raw = mkRaw()
    raw.criteria.reverse()
    expect(validateNachrichtGrade(raw, mkNachricht())!.totalScore).toBe(78)
  })
  test('consistency check: ≤2 covered cannot coexist with erfuellung ≥ 20', () => {
    const raw = mkRaw()
    raw.coverage[2].covered = false
    raw.coverage[3].covered = false
    expect(validateNachrichtGrade(raw, mkNachricht())).toBeNull()
  })
  test('unanchorable mistakes are dropped, not fatal', () => {
    const raw = mkRaw()
    raw.mistakes.push({ quote: 'gibt es hier nicht', suggested: 'x', kind: 'grammar', reasonDe: 'x', reasonEn: 'x' } as any)
    expect(validateNachrichtGrade(raw, mkNachricht())!.mistakes.length).toBe(1)
  })
  test('spelling mistakes are kept (typed-only module)', () => {
    const raw = mkRaw()
    raw.mistakes[0].kind = 'spelling'
    expect(validateNachrichtGrade(raw, mkNachricht())!.mistakes[0].kind).toBe('spelling')
  })
  test('non-object entries in mistakes drop instead of throwing', () => {
    const raw = mkRaw()
    raw.mistakes.push(null as any)
    expect(validateNachrichtGrade(raw, mkNachricht())!.mistakes.length).toBe(1)
  })
  test('more than 5 mistakes tightens the Aufwertung cap to 2', () => {
    const raw = mkRaw()
    const mistake = (quote: string) =>
      ({ quote, suggested: 'x', kind: 'grammar', reasonDe: 'x', reasonEn: 'x' } as any)
    raw.mistakes.push(
      mistake('vielen Dank'), mistake('Leider muss ich'), mistake('unbedingt nachholen'),
      mistake('Montagmorgen'), mistake('Protokoll')
    )
    const aufwertung = (quote: string) =>
      ({ quote, better: 'x', whyDe: 'x', whyEn: 'x' } as any)
    raw.aufwertungen.push(
      aufwertung('Wäre es möglich'), aufwertung('Für Ihr Verständnis'), aufwertung('Mit freundlichen Grüßen')
    )
    const r = validateNachrichtGrade(raw, mkNachricht())!
    expect(r.mistakes.length).toBe(6)
    expect(r.aufwertungen.length).toBe(2)
  })
  test('register mistakes are accepted (du/Sie-Brüche are the Teil-2 signature error)', () => {
    const raw = mkRaw()
    raw.mistakes[0].kind = 'register'
    expect(validateNachrichtGrade(raw, mkNachricht())!.mistakes[0].kind).toBe('register')
  })
  test('score out of range rejects', () => {
    const raw = mkRaw()
    raw.criteria[0].score = 26
    expect(validateNachrichtGrade(raw, mkNachricht())).toBeNull()
  })
})

describe('buildNachrichtGraderPrompt', () => {
  test('embeds the Empfänger, the four Inhaltspunkte, the word floor, the envelope and the tag enum', () => {
    const { system, user } = buildNachrichtGraderPrompt(mkNachricht())
    expect(user).toContain('Herr Semder')
    expect(user).toContain('Ihr Abteilungsleiter')
    for (const punkt of mkNachricht().auftrag.inhaltspunkte) {
      expect(user).toContain(punkt)
    }
    expect(user).toContain(NACHRICHT.slice(0, 40))
    // UMFANG: the count is computed in the builder, never left to the model,
    // and only `erfuellung` may be docked below the floor.
    expect(user).toContain('111 Wörter')
    expect(user).toContain(`Nur unter ${NACHRICHT_MIN_WORDS} Wörtern`)
    expect(user).toContain('erfuellung')
    expect(system).toContain('mindestens 100')
    expect(system).toContain('"criteria"')
    expect(system).toContain('register')
    expect(system).toContain('word-order')
    expect(system).not.toMatch(/```/)
  })
})
