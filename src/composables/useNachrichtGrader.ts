//
// Schreiben Teil 2 — the halbformelle-Nachricht grader (mirrors
// useSchreibenGrader.ts section for section, itself following the
// useVortragGrader / useSprechenGrader pattern): one temperature-0 call, strict
// validator, per-mistake and per-Aufwertung quote re-anchoring. The result is
// NEVER persisted to Dexie — it flows to sessionStorage[NACHRICHT_RESULT_KEY]
// for the one-time result page.
//
// Like Teil 1, this file deliberately REUSES `reAnchor`, `BilingualNote`,
// `GeminiClient` and `SprechenCriterionScore` from `useSprechenGrader.ts`, and
// `Aufwertung` from `useVortragGrader.ts`, rather than redeclaring them — one
// re-anchoring discipline and one criterion/Aufwertung shape across Sprechen
// and Schreiben.
//
// Two things separate this grader from Teil 1's Forumsbeitrag grader, both
// consequences of the genre (CONTEXT.md → "Nachricht"):
//
//  1. The RAHMEN. A Nachricht is addressed to a named person and needs Betreff,
//     Anrede and Grußformel. A MISSING frame part is not a "mistake" — there is
//     no quote to anchor it to — so the prompt routes it into the coverage
//     notes and `weaknesses` and lets it dock `erfuellung`, keeping `mistakes`
//     a list of things actually written down (and therefore anchorable).
//  2. REGISTER carries far more weight. du/Sie-Brüche, mündlicher Ton and
//     saloppe Abkürzungen (LG, MfG) are the signature Teil-2 error, so the
//     `register` tag names them explicitly, and the Aufwertungen are steered
//     toward Höflichkeits-Upgrades (a blunt sentence that would read better as
//     a Konjunktiv-II request) instead of general B2 polish.
//
// A Schreibauftrag's four Inhaltspunkte vary Auftrag by Auftrag, so — exactly
// as in Teil 1 — coverage is projected onto INDEX 0-3 in task-sheet order,
// never a key. `SchreibenNachricht` carries no Modality: the Schreiben exam is
// written, so there is no spoken-modality spelling caveat and no typo immunity.
// `spelling` is always a real, scorable mistake here (ADR-0020).

import {
  SCHREIBEN_B2_TEIL2, praedikat, type Praedikat
} from '../data/rubrics'
import {
  NACHRICHT_MIN_WORDS,
  type SchreibenNachricht, type SchreibauftragRef, type NachrichtHelps
} from '../data/schreibenNachricht'
import type { SchreibPlanEntry } from '../data/schreiben'
import type { HelpLogEntry } from '../data/sprechen'
import {
  reAnchor, type BilingualNote, type GeminiClient, type SprechenCriterionScore
} from './useSprechenGrader'
import type { Aufwertung } from './useVortragGrader'
import type { SprechenErrorTag } from './useQuizHistory'

// ── Result types ─────────────────────────────────────────────────

export interface NachrichtCoverageCell {
  index: number
  punkt: string
  covered: boolean
  note: string
}

export interface NachrichtMistake {
  quote: string
  suggested: string
  kind: SprechenErrorTag
  reasonDe: string
  reasonEn: string
  spanStart: number
}

export interface NachrichtGradeResult {
  totalScore: number
  passes: boolean
  praedikat: Praedikat
  criteria: SprechenCriterionScore[]
  coverage: NachrichtCoverageCell[]
  mistakes: NachrichtMistake[]
  aufwertungen: Aufwertung[]
  strengths: BilingualNote[]
  weaknesses: BilingualNote[]
  overallDe: string
  overallEn: string
}

export class NachrichtGraderError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'NachrichtGraderError'
  }
}

// Three, not Teil 1's five: a 100-word Nachricht simply has fewer sentences to
// polish, and five Aufwertungen on a short text drown out the mistakes.
export const NACHRICHT_AUFWERTUNG_CAP = 3

// ── Band anchors ───────────────────────────────────────────────────
//
// Grader-local by design, same reasoning as `TEIL1_BAND_ANCHORS` in
// useVortragGrader.ts and `SCHREIBEN_BAND_ANCHORS` in useSchreibenGrader.ts —
// the shared `SprechenCriterion` type (rubrics.ts) stays a free-text
// descriptor, and these numeric anchors never reach `rubrics.ts`. Contiguous
// bands (23-25 / 18-22 / 12-17 / 5-11): a Nachricht with isolated small slips
// still belongs in the top band, not pushed down into 18-22 for lack of a
// landing spot.
const NACHRICHT_BAND_ANCHORS: Record<'erfuellung' | 'kohaerenz' | 'wortschatz' | 'strukturen', string> = {
  erfuellung:
    '23–25: alle vier Inhaltspunkte ausgeführt, jeder mit mindestens einem ' +
    'eigenen Gedanken, sauberer Rahmen (Betreff, passende Anrede, Grußformel ' +
    'mit Name), Bezug auf die Situation der Empfängerin/des Empfängers, ' +
    'Mindestwortzahl erreicht — vereinzelte kleine Ausrutscher ändern daran ' +
    'nichts. 18–22: alle vier Punkte behandelt, einer davon knapp oder nur ' +
    'angetippt, Rahmen vollständig. 12–17: ein Punkt fehlt, mehrere bleiben ' +
    'oberflächlich, oder ein Teil des Rahmens (Betreff, Anrede, Grußformel) ' +
    'fehlt. 5–11: mehrere Punkte fehlen, der Text liest sich nicht als ' +
    'Nachricht an die genannte Person, oder er verfehlt die Mindestwortzahl ' +
    'deutlich.',
  kohaerenz:
    '23–25: klarer Bogen — Bezug auf den Anlass, Erklärung der Situation, ' +
    'Anliegen, verbindlicher Abschluss —, Inhaltspunkte zu Absätzen ' +
    'gebündelt, Konnektoren (deshalb, daher, dennoch, außerdem) verbinden die ' +
    'Gedanken sichtbar — vereinzelte kleine Ausrutscher ändern daran nichts. ' +
    '18–22: der Bogen ist erkennbar, Übergänge stellenweise abrupt oder ' +
    'Konnektoren wiederholen sich. 12–17: das Anliegen wird erst spät ' +
    'erkennbar, Sätze wirken aneinandergereiht statt zu Absätzen gebündelt. ' +
    '5–11: kein erkennbarer Bogen, der Anlass bleibt unklar, Sprünge von ' +
    'Gedanke zu Gedanke ohne Verbindung.',
  wortschatz:
    '23–25: präziser Wortschatz, durchgehend höfliches Sie-Register, ' +
    'treffende Wendungen des Bittens, Entschuldigens und Vorschlagens — ' +
    'vereinzelte kleine Ausrutscher ändern daran nichts. 18–22: überwiegend ' +
    'passendes Register, gelegentlich zu direkt oder allgemein formuliert. ' +
    '12–17: wiederkehrende Registerbrüche (mündlicher Ton, saloppe ' +
    'Abkürzungen), Wortschatz oft allgemein („machen", „gut"). 5–11: ' +
    'durchgehend unpassendes Register (du-Formen, Alltagston), sehr ' +
    'eingeschränkter Wortschatz, Bedeutung streckenweise unklar.',
  strukturen:
    '23–25: vielfältige, überwiegend korrekte Strukturen (Konjunktiv II für ' +
    'höfliche Bitten, Nebensätze, indirekte Fragen), Kommasetzung um Anrede ' +
    'und Einschübe sitzt, das Verständnis ist nie gestört — vereinzelte ' +
    'kleine Ausrutscher ändern daran nichts. 18–22: solide Grundstrukturen ' +
    'mit gelegentlichen Fehlern, das Verständnis bleibt durchgehend klar. ' +
    '12–17: einfache Hauptsätze dominieren, höfliche Konjunktiv-II-Formen ' +
    'fehlen, wiederkehrende Fehler erschweren das Verständnis stellenweise. ' +
    '5–11: Strukturen bleiben rudimentär, häufige Fehler beeinträchtigen das ' +
    'Verständnis merklich.'
}

// ── Schema ───────────────────────────────────────────────────────
//
// Same shape as SCHREIBEN_GRADE_SCHEMA (useSchreibenGrader.ts): no `phase` on
// mistakes (a Nachricht has no Rede/Nachfrage split) and `coverage` items keyed
// by `index` (0-3) instead of a fixed Gliederungspunkt `key`.
// `totalScore`/`passes` stay out of `required` — DERIVED, never trusted.

export const NACHRICHT_GRADE_SCHEMA = {
  type: 'object',
  properties: {
    totalScore: { type: 'number' },
    passes: { type: 'boolean' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          score: { type: 'number' },
          justificationDe: { type: 'string' },
          justificationEn: { type: 'string' }
        },
        required: ['key', 'score', 'justificationDe', 'justificationEn']
      }
    },
    coverage: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          covered: { type: 'boolean' },
          note: { type: 'string' }
        },
        required: ['index', 'covered', 'note']
      }
    },
    mistakes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string' },
          suggested: { type: 'string' },
          kind: { type: 'string' },
          reasonDe: { type: 'string' },
          reasonEn: { type: 'string' }
        },
        required: ['quote', 'suggested', 'kind', 'reasonDe', 'reasonEn']
      }
    },
    aufwertungen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string' },
          better: { type: 'string' },
          whyDe: { type: 'string' },
          whyEn: { type: 'string' }
        },
        required: ['quote', 'better', 'whyDe', 'whyEn']
      }
    },
    strengths: {
      type: 'array',
      items: {
        type: 'object',
        properties: { de: { type: 'string' }, en: { type: 'string' } },
        required: ['de', 'en']
      }
    },
    weaknesses: {
      type: 'array',
      items: {
        type: 'object',
        properties: { de: { type: 'string' }, en: { type: 'string' } },
        required: ['de', 'en']
      }
    },
    overallDe: { type: 'string' },
    overallEn: { type: 'string' }
  },
  required: ['criteria', 'coverage', 'mistakes', 'strengths', 'weaknesses', 'overallDe', 'overallEn']
}

// ── Validator ────────────────────────────────────────────────────

const ERROR_TAGS: readonly string[] = ['grammar', 'word-order', 'vocabulary', 'spelling', 'register']

function wordCount(text: string): number {
  const t = text.trim()
  return t.length === 0 ? 0 : t.split(/\s+/).length
}

export function validateNachrichtGrade(
  raw: unknown,
  n: SchreibenNachricht
): NachrichtGradeResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (typeof r.overallDe !== 'string' || typeof r.overallEn !== 'string') return null
  if (!Array.isArray(r.criteria) || !Array.isArray(r.mistakes)) return null
  if (!Array.isArray(r.strengths) || !Array.isArray(r.weaknesses)) return null
  if (!Array.isArray(r.coverage)) return null

  // Criteria — matched by KEY (local-claude gets no responseSchema and may
  // reorder), scores rounded to the nearest integer, range-checked. Every
  // rubric key must be present exactly once. totalScore/passes are DERIVED
  // from these — the model's own echoed arithmetic is ignored.
  const cList = (r.criteria as unknown[]).filter(
    (x): x is Record<string, unknown> => !!x && typeof x === 'object'
  )
  const criteria: SprechenCriterionScore[] = []
  let sum = 0
  for (const expected of SCHREIBEN_B2_TEIL2.criteria) {
    const c = cList.find(x => x.key === expected.key)
    if (!c) return null
    if (typeof c.score !== 'number' || !Number.isFinite(c.score)) return null
    const score = Math.round(c.score)
    if (score < 0 || score > expected.maxPoints) return null
    if (typeof c.justificationDe !== 'string' || typeof c.justificationEn !== 'string') return null
    sum += score
    criteria.push({
      key: expected.key,
      labelDe: expected.labelDe,
      maxPoints: expected.maxPoints,
      score,
      justificationDe: c.justificationDe,
      justificationEn: c.justificationEn
    })
  }

  const totalScore = sum
  const passes = totalScore >= SCHREIBEN_B2_TEIL2.passingScore

  // Coverage — projected onto exactly indices 0-3, in the Aufgabenblatt's own
  // order (never the model's order). A missing index rejects the whole grade.
  // `punkt` is denormalized from `n.auftrag.inhaltspunkte`, never taken from
  // the model — the same "build the cell literally" discipline as
  // VortragCoverageCell (ADR-0014).
  const covList = (r.coverage as unknown[]).filter(
    (x): x is Record<string, unknown> => !!x && typeof x === 'object'
  )
  const coverage: NachrichtCoverageCell[] = []
  for (let i = 0; i < 4; i++) {
    const cell = covList.find(x => x.index === i)
    if (!cell) return null
    const covered = cell.covered === true
    const note = typeof cell.note === 'string' ? cell.note : ''
    coverage.push({ index: i, punkt: n.auftrag.inhaltspunkte[i] ?? '', covered, note })
  }

  // Consistency check — an `erfuellung` score of 20+ claims nearly all four
  // Inhaltspunkte landed, so it cannot coexist with only two (or fewer)
  // marked covered. Low coverage together with a LOW erfuellung score is
  // consistent (the grader being appropriately strict) and must NOT be
  // rejected — only the high-score/low-coverage contradiction is.
  const coveredCount = coverage.filter(c => c.covered).length
  const erfuellungScore = criteria.find(c => c.key === 'erfuellung')?.score ?? 0
  if (coveredCount <= 2 && erfuellungScore >= 20) return null

  // Mistakes — re-anchored against the Nachricht text, unanchorable ones
  // silently dropped. That drop is also what enforces the frame rule from the
  // system prompt: a MISSING Anrede or Grußformel has no quote in the text, so
  // any "mistake" the model invents for it cannot anchor and disappears here —
  // the frame gap survives only where it belongs, in the coverage notes,
  // `weaknesses` and the `erfuellung` score.
  //
  // Unlike useVortragGrader.ts's typed/spoken split, `spelling` is NEVER
  // dropped: the Schreiben exam itself is written, so a typo is a real,
  // scorable mistake (ADR-0020). Each entry keeps an internal `spanEnd` for
  // the Aufwertung-overlap check below, which never reaches the returned
  // `NachrichtMistake` (that type carries `spanStart` only).
  const mistakesInternal = (r.mistakes as Array<Record<string, unknown>>).flatMap(m => {
    if (typeof m.quote !== 'string' || m.quote.trim().length === 0) return []
    if (typeof m.suggested !== 'string') return []
    if (typeof m.kind !== 'string' || !ERROR_TAGS.includes(m.kind)) return []
    if (typeof m.reasonDe !== 'string' || typeof m.reasonEn !== 'string') return []
    const anchored = reAnchor(m.quote, n.textDe)
    if (anchored.spanStart < 0) return []
    return [{
      quote: m.quote,
      suggested: m.suggested,
      kind: m.kind as SprechenErrorTag,
      reasonDe: m.reasonDe,
      reasonEn: m.reasonEn,
      spanStart: anchored.spanStart,
      spanEnd: anchored.spanEnd
    }]
  })

  const mistakes: NachrichtMistake[] = mistakesInternal.map(m => ({
    quote: m.quote,
    suggested: m.suggested,
    kind: m.kind,
    reasonDe: m.reasonDe,
    reasonEn: m.reasonEn,
    spanStart: m.spanStart
  }))

  // Aufwertungen — NOT errors. Optional by design (absent or malformed →
  // []), anchored against the Nachricht text, dropped when unanchorable and
  // never a reason to fail the whole grade.
  const rawAufwertungen = Array.isArray(r.aufwertungen) ? r.aufwertungen : []
  const anchoredAufwertungen = (rawAufwertungen as unknown[])
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .flatMap(a => {
      if (typeof a.quote !== 'string' || a.quote.trim().length === 0) return []
      if (typeof a.better !== 'string') return []
      if (typeof a.whyDe !== 'string' || typeof a.whyEn !== 'string') return []
      const anchored = reAnchor(a.quote, n.textDe)
      if (anchored.spanStart < 0) return []
      return [{
        quote: a.quote,
        better: a.better,
        whyDe: a.whyDe,
        whyEn: a.whyEn,
        spanStart: anchored.spanStart,
        spanEnd: anchored.spanEnd
      }]
    })

  // Aufwertung dosing — same rule as useVortragGrader.ts's F21: an Aufwertung
  // whose span overlaps a mistake's span is dropped ("improving" a spot the
  // grader itself already flagged wrong reads as contradictory), and what
  // survives is capped — NACHRICHT_AUFWERTUNG_CAP normally, 2 once the
  // Nachricht has more than 5 mistakes. Both thresholds sit one lower than
  // Teil 1's (5 / >6): the text is a third shorter.
  const overlapsAMistake = (a: { spanStart: number; spanEnd: number }) =>
    mistakesInternal.some(m => a.spanStart < m.spanEnd && m.spanStart < a.spanEnd)

  const aufwertungCap = mistakes.length > 5 ? 2 : NACHRICHT_AUFWERTUNG_CAP
  const aufwertungen: Aufwertung[] = anchoredAufwertungen
    .filter(a => !overlapsAMistake(a))
    .slice(0, aufwertungCap)

  const notes = (arr: unknown[]): BilingualNote[] =>
    (arr as Array<Record<string, unknown>>).flatMap(x =>
      typeof x?.de === 'string' && typeof x?.en === 'string' ? [{ de: x.de, en: x.en }] : []
    )

  return {
    totalScore,
    passes,
    praedikat: praedikat(totalScore),
    criteria,
    coverage,
    mistakes,
    aufwertungen,
    strengths: notes(r.strengths),
    weaknesses: notes(r.weaknesses),
    overallDe: r.overallDe,
    overallEn: r.overallEn
  }
}

// ── Prompt builder ───────────────────────────────────────────────

/** Opening sentence of the grader's system persona — typed-only, no Modality. */
function graderPersonaDe(): string {
  return 'Du bist eine faire, realistisch kalibrierte Prüferin für die schriftliche ' +
    'halbformelle Nachricht der Goethe-B2-Prüfung (Schreiben Teil 2), die hier als ' +
    'Übungsaufgabe getippt wird — kein Prüfergespräch, sondern ein eigenständig ' +
    'geschriebener Text an eine namentlich genannte Person. Du bewertest wie in der ' +
    'echten Goethe-Prüfung: wohlwollend im Zweifel, ohne Fehler zu erfinden.'
}

export function buildNachrichtGraderPrompt(
  n: SchreibenNachricht
): { system: string; user: string } {
  const rubricLines: string[] = []
  rubricLines.push(`RUBRIK: ${SCHREIBEN_B2_TEIL2.labelDe}`)
  rubricLines.push(`Maximalpunktzahl: ${SCHREIBEN_B2_TEIL2.totalMax} · Bestehensgrenze: ${SCHREIBEN_B2_TEIL2.passingScore}`)
  rubricLines.push('')
  rubricLines.push('Kriterien (in dieser Reihenfolge, jedes mit max. Punktzahl):')
  for (const c of SCHREIBEN_B2_TEIL2.criteria) {
    rubricLines.push(`- key="${c.key}" — ${c.labelDe} (max ${c.maxPoints} Punkte):`)
    rubricLines.push(`    ${c.descriptorDe}`)
    rubricLines.push(`    Bandbreiten: ${NACHRICHT_BAND_ANCHORS[c.key]}`)
  }
  rubricLines.push('')
  rubricLines.push(`Hinweis: ${SCHREIBEN_B2_TEIL2.notes}`)

  const system =
    graderPersonaDe() + ' Bewertet wird die NACHRICHT nach der Rubrik unten.\n\n' +
    'Zusätzlich markierst du JEDEN sprachlichen Fehler in der Nachricht:\n' +
    '- "quote": die fehlerhafte Stelle WÖRTLICH aus der Nachricht zitiert (exakte ' +
    'Zeichenfolge, keine Umformulierung).\n' +
    '- "suggested": die korrigierte Fassung der Stelle.\n' +
    '- "kind": GENAU EINE Kategorie aus: grammar (Kasus, Konjugation, Endungen), ' +
    'word-order (Verbstellung, Satzklammer), vocabulary (falsches Wort, ' +
    'Kollokation), spelling (Rechtschreibung), register (Stilebene — dazu gehören ' +
    'du/Sie-Brüche, mündlicher Ton und unpassende Abkürzungen wie „LG" oder ' +
    '„MfG" in einer halbformellen Nachricht).\n' +
    '- "reasonDe" UND "reasonEn": kurze Erklärung, WARUM es falsch ist (Deutsch ' +
    'einfach halten — B2-Lernende lesen sie).\n\n' +
    'RAHMEN: Eine fehlende Anrede, eine fehlende Grußformel oder ein fehlender ' +
    'Betreff senken die Erfüllung, sind aber KEINE "mistakes" — dafür gibt es keine ' +
    'zitierbare Stelle in der Nachricht. Solche Lücken gehören in die ' +
    'coverage-Noten und in "weaknesses", niemals in "mistakes".\n\n' +
    'Für "coverage": GENAU EIN Objekt für jeden der vier Inhaltspunkte des ' +
    'Aufgabenblatts (siehe INHALTSPUNKTE unten), mit "index" von 0 bis 3, in genau ' +
    'der Reihenfolge des Aufgabenblatts. Jedes Objekt: {"index": <0|1|2|3>, ' +
    '"covered": <true|false>, "note": "<kurze Begründung auf Deutsch, warum covered ' +
    'so gesetzt wurde>"}. "covered" ist true, wenn der Punkt inhaltlich mit ' +
    'mindestens einem eigenen Gedanken ausgeführt wurde, nicht nur angetippt.\n\n' +
    `"aufwertungen": höchstens ${NACHRICHT_AUFWERTUNG_CAP} Stellen in der Nachricht, ` +
    'die NICHT falsch sind, aber durch eine B2-typischere Formulierung ersetzt werden ' +
    'könnten — mit "quote" (wörtliches Zitat aus der Nachricht), "better" (die ' +
    'verbesserte Formulierung), "whyDe" und "whyEn" (kurze Begründung, Deutsch und ' +
    'Englisch). Bevorzuge Höflichkeits-Aufwertungen: ein direkter Satz, der als ' +
    'Konjunktiv-II-Bitte („Könnten Sie …", „Wäre es möglich, dass …") höflicher ' +
    'klänge. Das sind KEINE Fehler und dürfen die Punktzahl in keinem Kriterium ' +
    'verändern.\n\n' +
    'KALIBRIERUNG: Eine Nachricht, die alle vier Inhaltspunkte ausführt, durchgehend ' +
    'im höflichen Sie-Register bleibt, einen sauberen Rahmen hat (Betreff, passende ' +
    'Anrede, Grußformel mit Name) und nur vereinzelte Flüchtigkeitsfehler enthält, ' +
    'gehört in jedem Kriterium in das oberste Band (23–25), zusammen also in den ' +
    'Bereich 90–100 Punkte. Vergib im Zweifel die höhere Punktzahl.\n\n' +
    'Für jedes Kriterium: ganzzahlige Punktzahl im erlaubten Bereich plus kurze ' +
    'Begründung auf Deutsch UND Englisch. Danach Stärken, Schwächen und ein ' +
    'Gesamturteil, jeweils Deutsch und Englisch.\n' +
    'Antworte ausschließlich als EIN JSON-Objekt exakt dieser Form — kein ' +
    'Prosa-Vorspann, keine Markdown-Fences:\n' +
    '{"criteria": [{"key": "<erfuellung|kohaerenz|wortschatz|strukturen>", ' +
    '"score": <ganze Zahl 0-25>, "justificationDe": "…", "justificationEn": "…"}, ' +
    '… genau 4, in genau dieser Reihenfolge], ' +
    '"coverage": [{"index": <0|1|2|3>, "covered": <true|false>, "note": "…"}, ' +
    '… genau 4, in genau dieser Reihenfolge], ' +
    '"mistakes": [{"quote": "…", "suggested": "…", ' +
    '"kind": "<grammar|word-order|vocabulary|spelling|register>", ' +
    '"reasonDe": "…", "reasonEn": "…"}], ' +
    '"aufwertungen": [{"quote": "…", "better": "…", "whyDe": "…", "whyEn": "…"}], ' +
    '"strengths": [{"de": "…", "en": "…"}], "weaknesses": [{"de": "…", "en": "…"}], ' +
    '"overallDe": "…", "overallEn": "…"}\n\n' +
    rubricLines.join('\n')

  const inhaltspunkteListe = n.auftrag.inhaltspunkte
    .map((p, i) => `${i}. ${p}`)
    .join('\n')

  // Typed-words block, mirroring useSchreibenGrader.ts's `umfang`: the word
  // count is computed HERE so the model never has to count and never
  // miscounts. Above NACHRICHT_MIN_WORDS the length must not influence the
  // score at all; below it, only `erfuellung` may be docked, and NUR dort.
  const umfang =
    '\n\n' +
    `UMFANG: Die Nachricht umfasst ${wordCount(n.textDe)} Wörter (vom System gezählt). ` +
    `Ab ${NACHRICHT_MIN_WORDS} Wörtern darf der Umfang keine Punktzahl beeinflussen — ` +
    `weder positiv noch negativ. Nur unter ${NACHRICHT_MIN_WORDS} Wörtern mindert der ` +
    'geringe Umfang die Punktzahl bei erfuellung, und NUR dort.'

  const user =
    `SITUATION: ${n.auftrag.situationDe}\n` +
    `EMPFÄNGER: ${n.auftrag.empfaengerName} — ${n.auftrag.empfaengerRolleDe}\n` +
    `AUFGABE: ${n.auftrag.taskDe}\n\n` +
    `INHALTSPUNKTE:\n${inhaltspunkteListe}\n\n` +
    `NACHRICHT:\n${n.textDe}` +
    umfang

  return { system, user }
}

// ── Grader call with retries ─────────────────────────────────────

export async function gradeNachricht(
  client: GeminiClient,
  model: string,
  n: SchreibenNachricht,
  maxRetries = 2
): Promise<NachrichtGradeResult> {
  const { system, user } = buildNachrichtGraderPrompt(n)
  let attempts = 0
  let lastError = 'no attempts'

  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseSchema: NACHRICHT_GRADE_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0
        }
      })
      const text = response.text ?? ''
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        lastError = 'malformed JSON'
        continue
      }
      const validated = validateNachrichtGrade(parsed, n)
      if (validated === null) {
        lastError = 'validation failed'
        continue
      }
      return validated
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new NachrichtGraderError(`Grader exhausted ${attempts} attempts. Last error: ${lastError}`, attempts)
}

// ── Result stash (runner → result page, sessionStorage) ─────────

export const NACHRICHT_RESULT_KEY = 'gt:lastSchreibenTeil2Result'

/** One-time payload for the Schreiben Teil 2 result page. Dies with the tab — by design. */
export interface NachrichtResultStash {
  auftrag: SchreibauftragRef
  helps: NachrichtHelps
  plan: SchreibPlanEntry[]
  wordCount: number
  kiTippCount: number
  helpLog: HelpLogEntry[]
  nachrichtenmittel: string[]   // matched nm- ids, counted before discard
  startedAt: number
  finishedAt: number
  result: NachrichtGradeResult
}
