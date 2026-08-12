//
// Schreiben Teil 1 — the Forumsbeitrag grader (writing-grader / useVortragGrader
// pattern, itself mirroring useSprechenGrader.ts): one temperature-0 call, strict
// validator, per-mistake and per-Aufwertung quote re-anchoring. The result is
// NEVER persisted to Dexie — it flows to sessionStorage[SCHREIBEN_RESULT_KEY]
// for the one-time result page.
//
// This file deliberately REUSES `reAnchor`, `BilingualNote`, `GeminiClient` and
// `SprechenCriterionScore` from `useSprechenGrader.ts`, and `Aufwertung` from
// `useVortragGrader.ts`, rather than redeclaring them — one re-anchoring
// discipline and one criterion/Aufwertung shape across Sprechen and Schreiben.
//
// Unlike Sprechen Teil 1's five fixed Gliederungspunkte (one shared enum),
// a Schreibthema's four Inhaltspunkte vary theme by theme (CONTEXT.md →
// "Inhaltspunkt") — so coverage here is projected onto INDEX 0-3 in
// task-sheet order, never a key. `SchreibenBeitrag` also carries no Modality:
// the Schreiben exam itself is written, so — unlike the typed practice proxy
// in useVortragGrader.ts — there is no spoken-modality spelling caveat and no
// typo-immunity rule. `spelling` is always a real, scorable mistake here
// (ADR-0020).

import {
  SCHREIBEN_B2_TEIL1, praedikat, type Praedikat
} from '../data/rubrics'
import {
  SCHREIBEN_MIN_WORDS,
  type SchreibenBeitrag, type SchreibThemaRef, type SchreibHelps, type SchreibPlanEntry
} from '../data/schreiben'
import type { HelpLogEntry } from '../data/sprechen'
import {
  reAnchor, type BilingualNote, type GeminiClient, type SprechenCriterionScore
} from './useSprechenGrader'
import type { Aufwertung } from './useVortragGrader'
import type { SprechenErrorTag } from './useQuizHistory'

// ── Result types ─────────────────────────────────────────────────

export interface SchreibenCoverageCell {
  index: number
  punkt: string
  covered: boolean
  note: string
}

export interface SchreibenMistake {
  quote: string
  suggested: string
  kind: SprechenErrorTag
  reasonDe: string
  reasonEn: string
  spanStart: number
}

export interface SchreibenGradeResult {
  totalScore: number
  passes: boolean
  praedikat: Praedikat
  criteria: SprechenCriterionScore[]
  coverage: SchreibenCoverageCell[]
  mistakes: SchreibenMistake[]
  aufwertungen: Aufwertung[]
  strengths: BilingualNote[]
  weaknesses: BilingualNote[]
  overallDe: string
  overallEn: string
}

export class SchreibenGraderError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'SchreibenGraderError'
  }
}

export const SCHREIBEN_AUFWERTUNG_CAP = 5

// ── Band anchors ───────────────────────────────────────────────────
//
// Grader-local by design, same reasoning as `TEIL1_BAND_ANCHORS` in
// useVortragGrader.ts:92-105 — the shared `SprechenCriterion` type
// (rubrics.ts) stays a free-text descriptor, and these numeric anchors never
// reach `rubrics.ts`. Contiguous bands (23-25 / 18-22 / 12-17 / 5-11), same
// shape as Vortrag's: a Forumsbeitrag with isolated small slips still belongs
// in the top band, not pushed down into 18-22 for lack of a landing spot.
const SCHREIBEN_BAND_ANCHORS: Record<'erfuellung' | 'kohaerenz' | 'wortschatz' | 'strukturen', string> = {
  erfuellung:
    '23–25: alle vier Inhaltspunkte ausgeführt, jeder mit mindestens einem ' +
    'eigenen Gedanken, klare eigene Position, Mindestwortzahl erreicht — ' +
    'vereinzelte kleine Ausrutscher ändern daran nichts. 18–22: alle vier ' +
    'Punkte behandelt, einer davon knapp oder nur angetippt, Position ' +
    'erkennbar. 12–17: ein Punkt fehlt oder mehrere bleiben oberflächlich, ' +
    'Position behauptet statt begründet. 5–11: mehrere Punkte fehlen, kaum ' +
    'Bezug zum Aufgabenblatt oder der Text verfehlt die Mindestwortzahl ' +
    'deutlich.',
  kohaerenz:
    '23–25: durchgehend klar aufgebaut (Einleitung, Hauptteil, Schluss), ' +
    'Übergänge sitzen mit passenden Konnektoren, wirkt aus einem Guss — ' +
    'vereinzelte kleine Ausrutscher ändern daran nichts. 18–22: erkennbare ' +
    'Grobgliederung in Absätzen, Übergänge stellenweise abrupt oder ' +
    'Konnektoren wiederholen sich. 12–17: Gliederung nur in Ansätzen ' +
    'erkennbar, Absätze wirken eher aneinandergereiht als verbunden. 5–11: ' +
    'kaum erkennbare Struktur, Sprünge von Gedanke zu Gedanke ohne ' +
    'Verbindung.',
  wortschatz:
    '23–25: präziser, breiter Wortschatz mit treffenden Redemitteln des ' +
    'Argumentierens, kaum Wiederholungen — vereinzelte kleine Ausrutscher ' +
    'ändern daran nichts. 18–22: überwiegend passender Wortschatz, ' +
    'gelegentlich allgemein oder mit sich wiederholenden Wendungen. 12–17: ' +
    'Wortschatz oft allgemein („machen", „gut"), Redemittel beschränken ' +
    'sich auf ein oder zwei Wendungen. 5–11: sehr eingeschränkter ' +
    'Wortschatz, kaum thematisches Vokabular, Bedeutung streckenweise ' +
    'unklar.',
  strukturen:
    '23–25: vielfältige, überwiegend korrekte Strukturen (Nebensätze, ' +
    'Passiv, Konjunktiv II), das Verständnis ist nie gestört — vereinzelte ' +
    'kleine Ausrutscher ändern daran nichts. 18–22: solide Grundstrukturen ' +
    'mit gelegentlichen Fehlern, das Verständnis bleibt durchgehend klar. ' +
    '12–17: einfache Strukturen dominieren, wiederkehrende Fehler ' +
    'erschweren das Verständnis stellenweise. 5–11: Strukturen bleiben ' +
    'rudimentär, häufige Fehler beeinträchtigen das Verständnis merklich.'
}

// ── Schema ───────────────────────────────────────────────────────
//
// Same shape as VORTRAG_GRADE_SCHEMA (useVortragGrader.ts), minus `phase` on
// mistakes (a Forumsbeitrag has no Rede/Nachfrage split) and with `coverage`
// items keyed by `index` (0-3) instead of a fixed Gliederungspunkt `key`.
// `totalScore`/`passes` stay out of `required` — DERIVED, never trusted.

export const SCHREIBEN_GRADE_SCHEMA = {
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

export function validateSchreibenGrade(
  raw: unknown,
  b: SchreibenBeitrag
): SchreibenGradeResult | null {
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
  for (const expected of SCHREIBEN_B2_TEIL1.criteria) {
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
  const passes = totalScore >= SCHREIBEN_B2_TEIL1.passingScore

  // Coverage — projected onto exactly indices 0-3, in the Aufgabenblatt's own
  // order (never the model's order). A missing index rejects the whole
  // grade. `punkt` is denormalized from `b.thema.inhaltspunkte`, never taken
  // from the model — the same "build the cell literally" discipline as
  // VortragCoverageCell (ADR-0014).
  const covList = (r.coverage as unknown[]).filter(
    (x): x is Record<string, unknown> => !!x && typeof x === 'object'
  )
  const coverage: SchreibenCoverageCell[] = []
  for (let i = 0; i < 4; i++) {
    const cell = covList.find(x => x.index === i)
    if (!cell) return null
    const covered = cell.covered === true
    const note = typeof cell.note === 'string' ? cell.note : ''
    coverage.push({ index: i, punkt: b.thema.inhaltspunkte[i] ?? '', covered, note })
  }

  // Consistency check — an `erfuellung` score of 20+ claims nearly all four
  // Inhaltspunkte landed, so it cannot coexist with only two (or fewer)
  // marked covered. Low coverage together with a LOW erfuellung score is
  // consistent (the grader being appropriately strict) and must NOT be
  // rejected — only the high-score/low-coverage contradiction is.
  const coveredCount = coverage.filter(c => c.covered).length
  const erfuellungScore = criteria.find(c => c.key === 'erfuellung')?.score ?? 0
  if (coveredCount <= 2 && erfuellungScore >= 20) return null

  // Mistakes — re-anchored against the Beitrag text, unanchorable ones
  // silently dropped. Unlike useVortragGrader.ts's typed/spoken split,
  // `spelling` is NEVER dropped here: the Schreiben exam itself is written,
  // so a typo is a real, scorable mistake (ADR-0020) — kept alongside an
  // internal `spanEnd` for the Aufwertung-overlap check below, which never
  // reaches the returned `SchreibenMistake` (that type carries `spanStart`
  // only).
  const mistakesInternal = (r.mistakes as Array<Record<string, unknown>>).flatMap(m => {
    if (typeof m.quote !== 'string' || m.quote.trim().length === 0) return []
    if (typeof m.suggested !== 'string') return []
    if (typeof m.kind !== 'string' || !ERROR_TAGS.includes(m.kind)) return []
    if (typeof m.reasonDe !== 'string' || typeof m.reasonEn !== 'string') return []
    const anchored = reAnchor(m.quote, b.textDe)
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

  const mistakes: SchreibenMistake[] = mistakesInternal.map(m => ({
    quote: m.quote,
    suggested: m.suggested,
    kind: m.kind,
    reasonDe: m.reasonDe,
    reasonEn: m.reasonEn,
    spanStart: m.spanStart
  }))

  // Aufwertungen — NOT errors. Optional by design (absent or malformed →
  // []), anchored against the Beitrag text, dropped when unanchorable and
  // never a reason to fail the whole grade.
  const rawAufwertungen = Array.isArray(r.aufwertungen) ? r.aufwertungen : []
  const anchoredAufwertungen = (rawAufwertungen as unknown[])
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .flatMap(a => {
      if (typeof a.quote !== 'string' || a.quote.trim().length === 0) return []
      if (typeof a.better !== 'string') return []
      if (typeof a.whyDe !== 'string' || typeof a.whyEn !== 'string') return []
      const anchored = reAnchor(a.quote, b.textDe)
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

  // Aufwertung dosing — same rule as useVortragGrader.ts's F21: an
  // Aufwertung whose span overlaps a mistake's span is dropped ("improving"
  // a spot the grader itself already flagged wrong reads as contradictory),
  // and what survives is capped — SCHREIBEN_AUFWERTUNG_CAP normally, 2 once
  // the Beitrag has more than 6 mistakes.
  const overlapsAMistake = (a: { spanStart: number; spanEnd: number }) =>
    mistakesInternal.some(m => a.spanStart < m.spanEnd && m.spanStart < a.spanEnd)

  const aufwertungCap = mistakes.length > 6 ? 2 : SCHREIBEN_AUFWERTUNG_CAP
  const aufwertungen: Aufwertung[] = anchoredAufwertungen
    .filter(a => !overlapsAMistake(a))
    .slice(0, aufwertungCap)

  const notes = (arr: unknown[]): BilingualNote[] =>
    (arr as Array<Record<string, unknown>>).flatMap(n =>
      typeof n?.de === 'string' && typeof n?.en === 'string' ? [{ de: n.de, en: n.en }] : []
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
  return 'Du bist eine faire, realistisch kalibrierte Prüferin für den schriftlichen ' +
    'Goethe-B2-Forumsbeitrag (Schreiben Teil 1), der hier als Übungsaufgabe getippt ' +
    'wird — kein Prüfergespräch, sondern ein eigenständig geschriebener Text. Du ' +
    'bewertest wie in der echten Goethe-Prüfung: wohlwollend im Zweifel, ohne Fehler ' +
    'zu erfinden.'
}

export function buildSchreibenGraderPrompt(
  b: SchreibenBeitrag
): { system: string; user: string } {
  const rubricLines: string[] = []
  rubricLines.push(`RUBRIK: ${SCHREIBEN_B2_TEIL1.labelDe}`)
  rubricLines.push(`Maximalpunktzahl: ${SCHREIBEN_B2_TEIL1.totalMax} · Bestehensgrenze: ${SCHREIBEN_B2_TEIL1.passingScore}`)
  rubricLines.push('')
  rubricLines.push('Kriterien (in dieser Reihenfolge, jedes mit max. Punktzahl):')
  for (const c of SCHREIBEN_B2_TEIL1.criteria) {
    rubricLines.push(`- key="${c.key}" — ${c.labelDe} (max ${c.maxPoints} Punkte):`)
    rubricLines.push(`    ${c.descriptorDe}`)
    rubricLines.push(`    Bandbreiten: ${SCHREIBEN_BAND_ANCHORS[c.key]}`)
  }
  rubricLines.push('')
  rubricLines.push(`Hinweis: ${SCHREIBEN_B2_TEIL1.notes}`)

  const system =
    graderPersonaDe() + ' Bewertet wird der FORUMSBEITRAG nach der Rubrik unten.\n\n' +
    'Zusätzlich markierst du JEDEN sprachlichen Fehler im Beitrag:\n' +
    '- "quote": die fehlerhafte Stelle WÖRTLICH aus dem Beitrag zitiert (exakte ' +
    'Zeichenfolge, keine Umformulierung).\n' +
    '- "suggested": die korrigierte Fassung der Stelle.\n' +
    '- "kind": GENAU EINE Kategorie aus: grammar (Kasus, Konjugation, Endungen), ' +
    'word-order (Verbstellung, Satzklammer), vocabulary (falsches Wort, ' +
    'Kollokation), spelling (Rechtschreibung), register (Du/Sie, Stilebene, z. B. ' +
    'zu mündlicher Ton für einen schriftlichen Beitrag).\n' +
    '- "reasonDe" UND "reasonEn": kurze Erklärung, WARUM es falsch ist (Deutsch ' +
    'einfach halten — B2-Lernende lesen sie).\n\n' +
    'Für "coverage": GENAU EIN Objekt für jeden der vier Inhaltspunkte des ' +
    'Aufgabenblatts (siehe INHALTSPUNKTE unten), mit "index" von 0 bis 3, in genau ' +
    'der Reihenfolge des Aufgabenblatts. Jedes Objekt: {"index": <0|1|2|3>, ' +
    '"covered": <true|false>, "note": "<kurze Begründung auf Deutsch, warum covered ' +
    'so gesetzt wurde>"}. "covered" ist true, wenn der Punkt inhaltlich mit ' +
    'mindestens einem eigenen Gedanken ausgeführt wurde, nicht nur angetippt.\n\n' +
    `"aufwertungen": höchstens ${SCHREIBEN_AUFWERTUNG_CAP} Stellen im Beitrag, die ` +
    'NICHT falsch sind, aber durch eine B2-typischere Formulierung ersetzt werden ' +
    'könnten — mit "quote" (wörtliches Zitat aus dem Beitrag), "better" (die ' +
    'verbesserte Formulierung), "whyDe" und "whyEn" (kurze Begründung, Deutsch und ' +
    'Englisch). Das sind KEINE Fehler und dürfen die Punktzahl in keinem Kriterium ' +
    'verändern.\n\n' +
    'KALIBRIERUNG: Ein Forumsbeitrag, der alle vier Inhaltspunkte ausgeführt, klar ' +
    'gegliedert ist und nur vereinzelte Flüchtigkeitsfehler enthält, gehört in ' +
    'jedem Kriterium in das oberste Band (23–25), zusammen also in den Bereich ' +
    '90–100 Punkte. Vergib im Zweifel die höhere Punktzahl.\n\n' +
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

  const inhaltspunkteListe = b.thema.inhaltspunkte
    .map((p, i) => `${i}. ${p}`)
    .join('\n')

  // Typed-words block, mirroring useVortragGrader.ts's `umfang`: the word
  // count is computed HERE so the model never has to count and never
  // miscounts. Above SCHREIBEN_MIN_WORDS the length must not influence the
  // score at all; below it, only `erfuellung` may be docked, and NUR dort.
  const umfang =
    '\n\n' +
    `UMFANG: Der Beitrag umfasst ${wordCount(b.textDe)} Wörter (vom System gezählt). ` +
    `Ab ${SCHREIBEN_MIN_WORDS} Wörtern darf der Umfang keine Punktzahl beeinflussen — ` +
    `weder positiv noch negativ. Nur unter ${SCHREIBEN_MIN_WORDS} Wörtern mindert der ` +
    'geringe Umfang die Punktzahl bei erfuellung, und NUR dort.'

  const user =
    `THEMA: „${b.thema.titleDe}"\n` +
    `FORUM-KONTEXT: ${b.thema.forumContextDe}\n` +
    `AUFGABE: ${b.thema.taskDe}\n\n` +
    `INHALTSPUNKTE:\n${inhaltspunkteListe}\n\n` +
    `FORUMSBEITRAG:\n${b.textDe}` +
    umfang

  return { system, user }
}

// ── Grader call with retries ─────────────────────────────────────

export async function gradeSchreiben(
  client: GeminiClient,
  model: string,
  b: SchreibenBeitrag,
  maxRetries = 2
): Promise<SchreibenGradeResult> {
  const { system, user } = buildSchreibenGraderPrompt(b)
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
          responseSchema: SCHREIBEN_GRADE_SCHEMA as unknown as Record<string, unknown>,
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
      const validated = validateSchreibenGrade(parsed, b)
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
  throw new SchreibenGraderError(`Grader exhausted ${attempts} attempts. Last error: ${lastError}`, attempts)
}

// ── Result stash (runner → result page, sessionStorage) ─────────

export const SCHREIBEN_RESULT_KEY = 'gt:lastSchreibenTeil1Result'

/** One-time payload for the Schreiben Teil 1 result page. Dies with the tab — by design. */
export interface SchreibenResultStash {
  thema: SchreibThemaRef
  helps: SchreibHelps
  plan: SchreibPlanEntry[]
  wordCount: number
  kiTippCount: number
  helpLog: HelpLogEntry[]
  schreibmittel: string[]   // matched sm- ids, counted before discard
  startedAt: number
  finishedAt: number
  result: SchreibenGradeResult
}
