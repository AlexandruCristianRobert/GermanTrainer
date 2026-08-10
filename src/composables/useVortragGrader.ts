//
// Sprechen Teil 1 — the Vortrag grader (writing-grader / useSprechenGrader
// pattern): one temperature-0 call, strict validator, per-mistake and
// per-Aufwertung quote re-anchoring. The result is NEVER persisted to Dexie —
// it flows to sessionStorage[VORTRAG_RESULT_KEY] for the one-time result page.
//
// This file deliberately REUSES `reAnchor`, `BilingualNote`, `GeminiClient`
// and `SprechenCriterionScore` from `useSprechenGrader.ts` rather than
// redeclaring them — Teil 1 and Teil 2 share one re-anchoring discipline and
// one criterion-score shape, and duplicating them would let the two drift.
//
// ADR-0014: `coverage` is the grader's JUDGEMENT of whether a Gliederungspunkt
// was covered, not a word count. Each cell is built literally as
// `{ key, covered, note }` so a `words` field the model volunteers can never
// reach a consumer — we do not have per-point word counts and must not
// pretend to.

import {
  SPRECHEN_B2_TEIL1, sprechenDescriptor, sprechenNotes, praedikat, type Praedikat
} from '../data/rubrics'
import {
  GLIEDERUNGSPUNKTE, VORTRAG_MIN_WORDS, type GliederungKey
} from '../data/sprechenVortragsmittel'
import type {
  Modality, SprechenVortrag, VortragThemaRef, VortragHelps, VortragPlanEntry,
  RedeRecord, NachfrageRecord, HelpLogEntry
} from '../data/sprechen'
import { redezeit } from './useVortragTimer'
import {
  reAnchor, type BilingualNote, type GeminiClient, type SprechenCriterionScore
} from './useSprechenGrader'
import type { SprechenErrorTag } from './useQuizHistory'

// ── Result types ─────────────────────────────────────────────────

export interface VortragCoverageCell {
  key: GliederungKey
  covered: boolean
  note: string
}

export interface VortragMistake {
  phase: 'rede' | 'nachfrage'  // anchored against the Rede or the Nachfrage answer
  quote: string                // verbatim from the anchor text
  suggested: string
  kind: SprechenErrorTag
  reasonDe: string
  reasonEn: string
  spanStart: number
  spanEnd: number
}

/**
 * A B2-typischere Formulierung the grader noticed at a spot that is NOT
 * wrong. Never shaped like a mistake, never carries an error `kind`, and
 * must never be mistaken for one downstream — see the Global Constraints.
 */
export interface Aufwertung {
  quote: string
  better: string
  whyDe: string
  whyEn: string
  spanStart: number
  spanEnd: number
}

export interface VortragGradeResult {
  totalScore: number
  passes: boolean
  praedikat: Praedikat
  criteria: SprechenCriterionScore[]
  coverage: VortragCoverageCell[]
  mistakes: VortragMistake[]
  aufwertungen: Aufwertung[]
  strengths: BilingualNote[]
  weaknesses: BilingualNote[]
  overallDe: string
  overallEn: string
  generatedAt: number
  modelUsed: string
}

export class VortragGraderError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'VortragGraderError'
  }
}

export const AUFWERTUNG_CAP = 5

// ── Band anchors (F9) ──────────────────────────────────────────────
//
// Grader-local by design: the shared `SprechenCriterion` type (rubrics.ts)
// stays a free-text descriptor for BOTH Teile, and Teil 2 never sees these.
// Each string is four numeric bands in the descriptor's own register — they
// give the model concrete score anchors instead of leaving 0-25 to vibes,
// which is also why the per-Gliederungspunkt deduction rule travels with
// them rather than living in the shared rubric.
//
// The bands are CONTIGUOUS (23–25 / 18–22 / 12–17 / 5–11) by design: the
// earlier 24–25 / 18–19 / 12–13 / 5–6 set left holes at 20–23, so "very good
// with a couple of slips" had nowhere to land and fell to ~19 × 4 ≈ 76. The
// top band therefore also says out loud that isolated small slips do not cost
// it — a Vortrag only leaves 23–25 for a reason the band below names.
const TEIL1_BAND_ANCHORS: Record<'erfuellung' | 'kohaerenz' | 'wortschatz' | 'strukturen', string> = {
  erfuellung:
    '23–25: alle fünf Punkte tragen, Position klar begründet, Nachfrage ' +
    'inhaltlich beantwortet — vereinzelte kleine Ausrutscher ändern daran ' +
    'nichts. 18–22: alle Punkte vorhanden, einer nur angetippt, Position ' +
    'erkennbar. 12–17: ein Punkt fehlt oder mehrere bleiben oberflächlich, ' +
    'Position behauptet statt begründet. 5–11: mehrere Punkte fehlen, kaum ' +
    'Bezug zum Aufgabenblatt.',
  kohaerenz:
    '23–25: durchgehend klar gegliedert, Übergänge sitzen mit passenden ' +
    'Signalwörtern, wirkt aus einem Guss — vereinzelte kleine Ausrutscher ' +
    'ändern daran nichts. 18–22: erkennbare Grobgliederung, Übergänge ' +
    'stellenweise abrupt oder Signalwörter wiederholen sich. 12–17: ' +
    'Gliederung nur in Ansätzen erkennbar, Punkte wirken eher ' +
    'aneinandergereiht als verbunden. 5–11: kaum erkennbare Struktur, ' +
    'Sprünge von Gedanke zu Gedanke ohne Verbindung.',
  wortschatz:
    '23–25: präziser, breiter Wortschatz mit treffenden Fachbegriffen, ' +
    'Vortragsmittel wechseln merklich — vereinzelte kleine Ausrutscher ' +
    'ändern daran nichts. 18–22: überwiegend passender Wortschatz, ' +
    'gelegentlich allgemein oder mit sich wiederholenden Vortragsmitteln. ' +
    '12–17: Wortschatz oft allgemein („machen", „gut"), Vortragsmittel ' +
    'beschränken sich auf ein oder zwei Wendungen. 5–11: sehr ' +
    'eingeschränkter Wortschatz, kaum thematisches Vokabular, Bedeutung ' +
    'streckenweise unklar.',
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
// Same shape as SPRECHEN_GRADE_SCHEMA (useSprechenGrader.ts), with three
// differences: `mistakes.items` carries `phase` instead of `turnIndex`, a
// `coverage` array is added, and an `aufwertungen` array is added.
// `totalScore`/`passes` stay in `properties` (a model may still echo them)
// but are dropped from `required` — they are DERIVED, never trusted.

export const VORTRAG_GRADE_SCHEMA = {
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
          key: { type: 'string' },
          covered: { type: 'boolean' },
          note: { type: 'string' }
        },
        required: ['key', 'covered', 'note']
      }
    },
    mistakes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phase: { type: 'string' },
          quote: { type: 'string' },
          suggested: { type: 'string' },
          kind: { type: 'string' },
          reasonDe: { type: 'string' },
          reasonEn: { type: 'string' }
        },
        required: ['phase', 'quote', 'suggested', 'kind', 'reasonDe', 'reasonEn']
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

export function validateVortragGrade(
  raw: unknown,
  v: SprechenVortrag
): VortragGradeResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (typeof r.overallDe !== 'string' || typeof r.overallEn !== 'string') return null
  if (!Array.isArray(r.criteria) || !Array.isArray(r.mistakes)) return null
  if (!Array.isArray(r.strengths) || !Array.isArray(r.weaknesses)) return null
  if (!Array.isArray(r.coverage)) return null

  // Criteria — matched by KEY (local-claude gets no responseSchema and may
  // reorder), scores rounded to the nearest integer, range-checked. Every
  // rubric key must be present exactly once. totalScore/passes are DERIVED
  // from these — the model's own echoed arithmetic is ignored (see
  // useSprechenGrader.ts for why: it burns retries on local-claude).
  const cList = (r.criteria as unknown[]).filter(
    (x): x is Record<string, unknown> => !!x && typeof x === 'object'
  )
  const criteria: SprechenCriterionScore[] = []
  let sum = 0
  for (const expected of SPRECHEN_B2_TEIL1.criteria) {
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
  const passes = totalScore >= SPRECHEN_B2_TEIL1.passingScore

  // Coverage — projected onto exactly the five GLIEDERUNGSPUNKTE keys, in
  // rubric order. Built LITERALLY as { key, covered, note } (ADR-0014): a
  // `words` field the model volunteers must never reach a consumer, because
  // we do not have per-point word counts and must not pretend to.
  const covList = (r.coverage as unknown[]).filter(
    (x): x is Record<string, unknown> => !!x && typeof x === 'object'
  )
  const coverage: VortragCoverageCell[] = []
  for (const p of GLIEDERUNGSPUNKTE) {
    const cell = covList.find(x => x.key === p.key)
    if (!cell) return null
    const covered = cell.covered === true
    const note = typeof cell.note === 'string' ? cell.note : ''
    coverage.push({ key: p.key, covered, note })
  }

  // F9 — consistency check. `erfuellung`'s own descriptor says an omitted or
  // barely-covered Gliederungspunkt must dock its score ("ein ausgelassener
  // oder nur angetippter Gliederungspunkt mindert die Punktzahl"), so a grade
  // claiming most points are missing while still scoring erfuellung as if
  // nearly all five landed is self-contradictory — "2 von 5 Punkten
  // behandelt, aber 21/25 auf erfuellung" cannot both be true. Low coverage
  // together with a LOW erfuellung score is consistent (the grader is just
  // being appropriately strict about a weak Vortrag) and must NOT be
  // rejected — only the high-score/low-coverage contradiction is.
  const coveredCount = coverage.filter(c => c.covered).length
  const erfuellungScore = criteria.find(c => c.key === 'erfuellung')?.score ?? 0
  if (coveredCount <= 3 && erfuellungScore >= 20) return null

  // Mistakes — phase decides the anchor text: the Rede for 'rede', the
  // Nachfrage answer for 'nachfrage'. Silently drop what cannot be verified.
  // A spoken Vortrag's transcript spelling is the recognizer's, not the
  // learner's — drop `spelling` entirely rather than archive a phantom
  // mistake as the learner's own.
  const mistakes: VortragMistake[] = (r.mistakes as Array<Record<string, unknown>>).flatMap(m => {
    if (m.phase !== 'rede' && m.phase !== 'nachfrage') return []
    if (typeof m.quote !== 'string' || m.quote.trim().length === 0) return []
    if (typeof m.suggested !== 'string') return []
    if (typeof m.kind !== 'string' || !ERROR_TAGS.includes(m.kind)) return []
    if (m.kind === 'spelling' && v.modality === 'spoken') return []
    if (typeof m.reasonDe !== 'string' || typeof m.reasonEn !== 'string') return []
    const anchorText = m.phase === 'rede' ? v.rede.textDe : (v.nachfrage?.answerDe ?? '')
    const anchored = reAnchor(m.quote, anchorText)
    if (anchored.spanStart < 0) return []
    return [{
      phase: m.phase,
      quote: m.quote,
      suggested: m.suggested,
      kind: m.kind as SprechenErrorTag,
      reasonDe: m.reasonDe,
      reasonEn: m.reasonEn,
      spanStart: anchored.spanStart,
      spanEnd: anchored.spanEnd
    }]
  })

  // Aufwertungen — NOT errors. Optional by design (absent or malformed → []),
  // anchored against the Rede first and the Nachfrage answer second, dropped
  // when unanchorable. Never a reason to fail the whole grade, and never
  // shaped like a mistake (no `kind`, no error tag).
  const rawAufwertungen = Array.isArray(r.aufwertungen) ? r.aufwertungen : []
  const anchoredAufwertungen = (rawAufwertungen as unknown[])
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .flatMap(a => {
      if (typeof a.quote !== 'string' || a.quote.trim().length === 0) return []
      if (typeof a.better !== 'string') return []
      if (typeof a.whyDe !== 'string' || typeof a.whyEn !== 'string') return []
      let anchored = reAnchor(a.quote, v.rede.textDe)
      let phase: 'rede' | 'nachfrage' = 'rede'
      if (anchored.spanStart < 0 && v.nachfrage) {
        anchored = reAnchor(a.quote, v.nachfrage.answerDe)
        phase = 'nachfrage'
      }
      if (anchored.spanStart < 0) return []
      return [{
        quote: a.quote,
        better: a.better,
        whyDe: a.whyDe,
        whyEn: a.whyEn,
        spanStart: anchored.spanStart,
        spanEnd: anchored.spanEnd,
        phase
      }]
    })

  // F21 — Aufwertung dosing. An Aufwertung whose span overlaps a mistake's
  // span IN THE SAME PHASE'S TEXT (spans are coordinates into either the
  // Rede or the Nachfrage answer, never comparable across the two) is
  // dropped: "improving" a spot the grader itself already flagged wrong
  // reads as contradictory, not encouraging. What survives is then capped —
  // AUFWERTUNG_CAP normally, but only 2 once the Vortrag has more than 6
  // mistakes, so a rough run isn't buried in "nice, but" notes instead of
  // fixes.
  const overlapsAMistake = (a: { spanStart: number; spanEnd: number; phase: 'rede' | 'nachfrage' }) =>
    mistakes.some(m => m.phase === a.phase && a.spanStart < m.spanEnd && m.spanStart < a.spanEnd)

  const aufwertungCap = mistakes.length > 6 ? 2 : AUFWERTUNG_CAP
  const aufwertungen: Aufwertung[] = anchoredAufwertungen
    .filter(a => !overlapsAMistake(a))
    .slice(0, aufwertungCap)
    .map(a => ({
      quote: a.quote,
      better: a.better,
      whyDe: a.whyDe,
      whyEn: a.whyEn,
      spanStart: a.spanStart,
      spanEnd: a.spanEnd
    }))

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
    overallEn: r.overallEn,
    generatedAt: Date.now(),
    modelUsed: 'unknown'
  }
}

// ── Modality-aware prompt fragments ───────────────────────────────
//
// Same resolver pattern as useSprechenGrader.ts: a typed persona plus a
// spoken variant that names speech recognition, and a spelling caveat that
// only fires for spoken runs.

function graderPersonaDe(modality: Modality): string {
  return modality === 'spoken'
    ? 'Du bist eine faire, realistisch kalibrierte Prüferin für den mündlichen ' +
      'Goethe-B2-Vortrag (Sprechen Teil 1), der hier gesprochen und automatisch ' +
      'per Spracherkennung transkribiert wurde. Du bewertest wie in der echten ' +
      'Goethe-Prüfung: wohlwollend im Zweifel, ohne Fehler zu erfinden.'
    : 'Du bist eine faire, realistisch kalibrierte Prüferin für den mündlichen ' +
      'Goethe-B2-Vortrag (Sprechen Teil 1), der hier in getippter Form geübt ' +
      'wird. Du bewertest wie in der echten Goethe-Prüfung: wohlwollend im ' +
      'Zweifel, ohne Fehler zu erfinden.'
}

// For spoken runs the transcript's spelling is the speech recognizer's
// choice, not the learner's — assigning "spelling" against it would archive
// a phantom mistake as the learner's own. Only the spoken PROMPT is told to
// never assign it; the tag itself stays valid for typed runs.
function spellingCaveatDe(modality: Modality): string {
  return modality === 'spoken'
    ? '- WICHTIG: Dieser Vortrag wurde GESPROCHEN und automatisch per ' +
      'Spracherkennung transkribiert. Die Schreibweise stammt von der ' +
      'Erkennungssoftware, NICHT vom Lernenden — vergib daher NIEMALS die ' +
      'Kategorie "spelling".\n'
    : ''
}

// The mirror image of the caveat above, for TYPED runs: the real exam is oral,
// so a typo is a keyboard slip, not a language error the Prüfung would ever
// see. It stays visible as feedback (the learner still wants it flagged) but
// must not reach any criterion score. Spoken runs never need it — the
// `spelling` tag is already banned there, and dropped by the validator.
function typoRuleDe(modality: Modality): string {
  return modality === 'spoken'
    ? ''
    : '- Tippfehler (Kategorie "spelling") werden als Fehler aufgelistet, ' +
      'dürfen aber KEINE Kriteriumsnote senken — die echte Prüfung ist ' +
      'mündlich, dort wird Rechtschreibung nicht bewertet.\n'
}

/** m:ss, floor-guarded — same shape as RedezeitState.clock but standalone. */
function clockFmt(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** SPRECHDATEN block — delivery evidence for "kohaerenz" only, spoken runs. */
function formatVortragSprechdaten(v: RedeRecord, modality: Modality): string {
  const seconds = v.seconds ?? 0
  const words = wordCount(v.textDe)
  const state = redezeit({ words, seconds, modality })
  const minutes = seconds / 60
  const wpm = minutes > 0 ? Math.round(words / minutes) : 0
  const restarts = v.restarts ?? 0
  // F2 — Gesamtdauer/Pausenzeit only exist once the runner has a wall clock
  // (mic-open-to-mic-open time), which the mic-paused-but-tab-open case adds
  // on top of Redezeit. Pausenzeit is thinking time an examiner would not
  // grant, so it is named as such rather than left to speak for itself.
  const wallLine = typeof v.wallSeconds === 'number'
    ? `\nGesamtdauer ${clockFmt(v.wallSeconds)} · Pausenzeit ${clockFmt(Math.max(0, v.wallSeconds - seconds))}. ` +
      'Pausenzeit ist Denkzeit, die die Prüfung nicht gewähren würde.'
    : ''
  return (
    'SPRECHDATEN (nur für die Bewertung von "kohaerenz" — siehe Warnung oben):\n' +
    `Redezeit ${state.clock} · ${wpm} Wörter/Min · ${restarts} lange(n) Pause(n).` +
    wallLine
  )
}

// ── Prompt builder ───────────────────────────────────────────────

export function buildVortragGraderPrompt(
  v: SprechenVortrag
): { system: string; user: string } {
  const rubricLines: string[] = []
  rubricLines.push(`RUBRIK: ${SPRECHEN_B2_TEIL1.labelDe}`)
  rubricLines.push(`Maximalpunktzahl: ${SPRECHEN_B2_TEIL1.totalMax} · Bestehensgrenze: ${SPRECHEN_B2_TEIL1.passingScore}`)
  rubricLines.push('')
  rubricLines.push('Kriterien (in dieser Reihenfolge, jedes mit max. Punktzahl):')
  for (const c of SPRECHEN_B2_TEIL1.criteria) {
    rubricLines.push(`- key="${c.key}" — ${c.labelDe} (max ${c.maxPoints} Punkte):`)
    rubricLines.push(`    ${sprechenDescriptor(c, v.modality)}`)
    rubricLines.push(`    Bandbreiten: ${TEIL1_BAND_ANCHORS[c.key]}`)
  }
  rubricLines.push('')
  rubricLines.push('Pro nicht behandeltem Gliederungspunkt mindestens 4 Punkte Abzug bei erfuellung.')
  rubricLines.push('')
  rubricLines.push(`Hinweis: ${sprechenNotes(SPRECHEN_B2_TEIL1, v.modality)}`)

  const coverageKeys = GLIEDERUNGSPUNKTE.map(p => `"${p.key}" (${p.labelDe})`).join(', ')

  const system =
    graderPersonaDe(v.modality) + ' Du bewertest den VORTRAG und, falls vorhanden, die ' +
    'ANTWORT auf die Nachfrage nach der Rubrik unten.\n\n' +
    'Zusätzlich markierst du JEDEN sprachlichen Fehler im Vortrag und in der ' +
    'Nachfrage-Antwort:\n' +
    '- "phase": "rede", wenn der Fehler im VORTRAG vorkommt, oder "nachfrage", ' +
    'wenn er in der ANTWORT auf die Nachfrage vorkommt.\n' +
    '- "quote": die fehlerhafte Stelle WÖRTLICH aus dem jeweiligen Text zitiert ' +
    '(exakte Zeichenfolge, keine Umformulierung).\n' +
    '- "suggested": die korrigierte Fassung der Stelle.\n' +
    '- "kind": GENAU EINE Kategorie aus: grammar (Kasus, Konjugation, Endungen), ' +
    'word-order (Verbstellung, Satzklammer), vocabulary (falsches Wort, ' +
    'Kollokation), spelling (Rechtschreibung), register (Du/Sie, Stilebene).\n' +
    spellingCaveatDe(v.modality) +
    typoRuleDe(v.modality) +
    '- "reasonDe" UND "reasonEn": kurze Erklärung, WARUM es falsch ist ' +
    '(Deutsch einfach halten — B2-Lernende lesen sie).\n\n' +
    `Für "coverage": GENAU EIN Objekt für jeden der fünf Gliederungspunkte, in ` +
    `dieser Reihenfolge — ${coverageKeys}. Jedes Objekt: ` +
    '{"key": "<einstieg|situation|aspekte|erfahrung|fazit>", "covered": <true|false>, ' +
    '"note": "<kurze Begründung auf Deutsch, warum covered so gesetzt wurde>"}. ' +
    '"covered" ist true, wenn der Punkt inhaltlich behandelt wurde, nicht nur ' +
    'angetippt.\n\n' +
    '"aufwertungen": höchstens fünf Stellen im Vortrag, die NICHT falsch sind, ' +
    'aber durch eine B2-typischere Formulierung ersetzt werden könnten — mit ' +
    '"quote" (wörtliches Zitat aus dem Vortrag), "better" (die verbesserte ' +
    'Formulierung), "whyDe" und "whyEn" (kurze Begründung, Deutsch und ' +
    'Englisch). Das sind KEINE Fehler und dürfen die Punktzahl in keinem ' +
    'Kriterium verändern.\n\n' +
    'KALIBRIERUNG: Ein Vortrag, der alle fünf Gliederungspunkte behandelt, klar ' +
    'gegliedert ist und nur vereinzelte kleine Fehler enthält, gehört in den ' +
    'Bereich 90–100. Vergib im Zweifel die höhere Punktzahl.\n\n' +
    'Für jedes Kriterium: ganzzahlige Punktzahl im erlaubten Bereich plus kurze ' +
    'Begründung auf Deutsch UND Englisch. Danach Stärken, Schwächen und ein ' +
    'Gesamturteil, jeweils Deutsch und Englisch.\n' +
    'Antworte ausschließlich als EIN JSON-Objekt exakt dieser Form — kein ' +
    'Prosa-Vorspann, keine Markdown-Fences:\n' +
    '{"criteria": [{"key": "<erfuellung|kohaerenz|wortschatz|strukturen>", ' +
    '"score": <ganze Zahl 0-25>, "justificationDe": "…", "justificationEn": "…"}, ' +
    '… genau 4, in genau dieser Reihenfolge], ' +
    '"coverage": [{"key": "<einstieg|situation|aspekte|erfahrung|fazit>", ' +
    '"covered": <true|false>, "note": "…"}, … genau 5, in genau dieser Reihenfolge], ' +
    '"mistakes": [{"phase": "<rede|nachfrage>", "quote": "…", "suggested": "…", ' +
    '"kind": "<grammar|word-order|vocabulary|spelling|register>", ' +
    '"reasonDe": "…", "reasonEn": "…"}], ' +
    '"aufwertungen": [{"quote": "…", "better": "…", "whyDe": "…", "whyEn": "…"}], ' +
    '"strengths": [{"de": "…", "en": "…"}], "weaknesses": [{"de": "…", "en": "…"}], ' +
    '"overallDe": "…", "overallEn": "…"}\n\n' +
    rubricLines.join('\n')

  const nachfrageBlock = v.nachfrage
    ? `NACHFRAGE:\n${v.nachfrage.questionDe}\nANTWORT:\n${v.nachfrage.answerDe}`
    : 'HINWEIS: Es wurde keine Nachfrage gestellt — bewerte „erfuellung" deswegen ' +
      'nicht negativ.'

  // Spoken-only evidence block. Typed runs never touch this branch.
  const sprechdaten = v.modality === 'spoken' && typeof v.rede.seconds === 'number'
    ? '\n\n' +
      'SPRECHDATEN-HINWEIS: Dieser Vortrag wurde GESPROCHEN gehalten ' +
      '(Spracherkennung, keine Audioaufnahme). Die folgenden Werte — Redezeit, ' +
      'Wörter pro Minute, Anzahl langer Pausen — beschreiben AUSSCHLIESSLICH ' +
      'die Vortragsweise (Delivery) des Lernenden. Nutze sie NUR für die ' +
      'Bewertung von "kohaerenz". Sie dürfen die Bewertung von "erfuellung", ' +
      '"wortschatz" und "strukturen" NICHT beeinflussen.\n\n' +
      formatVortragSprechdaten(v.rede, v.modality)
    : ''

  // Typed-only counterpart to the SPRECHDATEN block: a typed Rede has no
  // clock, so the only length evidence is the word count — computed HERE so
  // the model never has to count and never miscounts. The rule attached to it
  // takes length out of the scoring above VORTRAG_MIN_WORDS entirely; below it
  // only `erfuellung` may move. Spoken runs get the real clock instead and are
  // never told about a word floor.
  const umfang = v.modality === 'spoken'
    ? ''
    : '\n\n' +
      `UMFANG: Der Vortrag umfasst ${wordCount(v.rede.textDe)} Wörter (vom System gezählt). ` +
      `Ab ${VORTRAG_MIN_WORDS} Wörtern darf der Umfang keine Punktzahl beeinflussen — ` +
      `weder positiv noch negativ. Nur unter ${VORTRAG_MIN_WORDS} Wörtern mindert der ` +
      'geringe Umfang die Punktzahl bei erfuellung, und NUR dort.'

  const user =
    `THEMA: „${v.thema.titleDe}"\n` +
    `AUFGABE: ${v.thema.taskDe}\n\n` +
    `VORTRAG:\n${v.rede.textDe}\n\n` +
    nachfrageBlock +
    sprechdaten +
    umfang

  return { system, user }
}

// ── Grader call with retries ─────────────────────────────────────

export async function gradeVortrag(
  client: GeminiClient,
  model: string,
  v: SprechenVortrag,
  maxRetries = 2
): Promise<VortragGradeResult> {
  const { system, user } = buildVortragGraderPrompt(v)
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
          responseSchema: VORTRAG_GRADE_SCHEMA as unknown as Record<string, unknown>,
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
      const validated = validateVortragGrade(parsed, v)
      if (validated === null) {
        lastError = 'validation failed'
        continue
      }
      validated.modelUsed = model
      return validated
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }
  throw new VortragGraderError(`Grader exhausted ${attempts} attempts. Last error: ${lastError}`, attempts)
}

// ── Result stash (runner → result page, sessionStorage) ─────────

export const VORTRAG_RESULT_KEY = 'gt:lastSprechenTeil1Result'

/** One-time payload for the Teil 1 result page. Dies with the tab — by design. */
export interface Teil1ResultStash {
  thema: VortragThemaRef
  modality: Modality
  helps: VortragHelps
  plan: VortragPlanEntry[]
  rede: RedeRecord
  nachfrage?: NachfrageRecord
  kiTippCount: number
  helpLog: HelpLogEntry[]
  vortragsmittel: string[]     // matched ids, for the Ausbeute block
  startedAt: number
  finishedAt: number
  result: VortragGradeResult
  downgradedAt?: number        // F13 — mirrors SprechenVortrag.downgradedAt onto the stash
}
