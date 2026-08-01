//
// Post-Discussion analysis (writing-grader pattern): one temperature-0 call,
// strict validator, per-turn quote re-anchoring. The result is NEVER persisted
// to Dexie — it flows to sessionStorage['gt:lastSprechenResult'] for the
// one-time result page, and only summary fields reach Run meta.

import { SPRECHEN_B2_TEIL2, praedikat, sprechenDescriptor, sprechenNotes, type Praedikat } from '../data/rubrics'
import type { DiscussionTurn, Modality, SprechenDiscussion } from '../data/sprechen'
import { learnerTurnCount, summarizeFluency } from '../data/sprechen'
import type { SprechenErrorTag } from './useQuizHistory'

// ── Result types ─────────────────────────────────────────────────

export interface SprechenMistake {
  turnIndex: number          // index into the LEARNER-turn list (0-based)
  quote: string              // verbatim from that learner turn
  suggested: string
  kind: SprechenErrorTag     // exactly one per mistake (see CONTEXT.md)
  reasonDe: string
  reasonEn: string
  spanStart: number          // char offsets within that learner turn's textDe
  spanEnd: number
}

export interface SprechenCriterionScore {
  key: string
  labelDe: string
  maxPoints: number
  score: number
  justificationDe: string
  justificationEn: string
}

export interface BilingualNote { de: string; en: string }

/**
 * Descriptive only — see spec decision 4. The official Goethe B2 criteria do
 * NOT score Argumentationsfähigkeit and Interaktionsfähigkeit separately; both
 * are aspects of `erfuellung`, which is why its label is 'Erfüllung /
 * Interaktion'. These fields explain where that criterion landed. They move
 * no points and the rubric is unchanged.
 */
export interface TurnStructure {
  these: boolean          // did the turn state a position?
  begruendung: boolean    // did it give a reason?
  beispiel: boolean       // did it give a concrete example?
  reacts: boolean         // did it engage the partner's previous point?
}

export interface InteractionSummary {
  askedBack: number       // Rückfragen to the partner
  rate: number            // 0–1, turns that react / total turns
}

export interface SprechenGradeResult {
  totalScore: number
  passes: boolean
  praedikat: Praedikat       // computed locally from totalScore, never trusted from the model
  criteria: SprechenCriterionScore[]
  mistakes: SprechenMistake[]
  strengths: BilingualNote[]
  weaknesses: BilingualNote[]
  overallDe: string
  overallEn: string
  generatedAt: number
  modelUsed: string
  structure?: TurnStructure[]     // optional, descriptive — see TurnStructure above
  interaction?: InteractionSummary // optional, descriptive — see InteractionSummary above
}

// ── Gemini client shape (matches useKonjunktivQuiz.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export class SprechenGraderError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'SprechenGraderError'
  }
}

// ── Schema ───────────────────────────────────────────────────────

export const SPRECHEN_GRADE_SCHEMA = {
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
    mistakes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          turnIndex: { type: 'number' },
          quote: { type: 'string' },
          suggested: { type: 'string' },
          kind: { type: 'string' },
          reasonDe: { type: 'string' },
          reasonEn: { type: 'string' }
        },
        required: ['turnIndex', 'quote', 'suggested', 'kind', 'reasonDe', 'reasonEn']
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
    overallEn: { type: 'string' },
    structure: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          these: { type: 'boolean' },
          begruendung: { type: 'boolean' },
          beispiel: { type: 'boolean' },
          reacts: { type: 'boolean' }
        },
        required: ['these', 'begruendung', 'beispiel', 'reacts']
      }
    },
    interaction: {
      type: 'object',
      properties: { askedBack: { type: 'number' }, rate: { type: 'number' } },
      required: ['askedBack', 'rate']
    }
  },
  required: ['totalScore', 'passes', 'criteria', 'mistakes', 'strengths', 'weaknesses', 'overallDe', 'overallEn']
}

// ── Validator ────────────────────────────────────────────────────

const ERROR_TAGS: readonly string[] = ['grammar', 'word-order', 'vocabulary', 'spelling', 'register']

export function learnerTurns(d: Pick<SprechenDiscussion, 'turns'>): DiscussionTurn[] {
  return d.turns.filter(t => t.role === 'learner')
}

// Exported for Teil2Result.vue: the result page re-anchors a mistake's span
// against the CURRENT turn text at render time rather than trusting the span
// it happens to carry in the stash — a stored spanStart/spanEnd is only ever
// a snapshot from grade time, and the result page must never rely on it.
export function reAnchor(quote: string, text: string): { spanStart: number; spanEnd: number } {
  if (quote.length === 0) return { spanStart: -1, spanEnd: -1 }
  const exact = text.indexOf(quote)
  if (exact >= 0) return { spanStart: exact, spanEnd: exact + quote.length }
  const lower = text.toLowerCase().indexOf(quote.toLowerCase())
  if (lower >= 0) return { spanStart: lower, spanEnd: lower + quote.length }
  return { spanStart: -1, spanEnd: -1 }
}

export function validateSprechenGrade(
  raw: unknown,
  d: SprechenDiscussion
): SprechenGradeResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (typeof r.overallDe !== 'string' || typeof r.overallEn !== 'string') return null
  if (!Array.isArray(r.criteria) || !Array.isArray(r.mistakes)) return null
  if (!Array.isArray(r.strengths) || !Array.isArray(r.weaknesses)) return null

  // Criteria — matched by KEY (local-claude gets no responseSchema and may
  // reorder), scores rounded to the nearest integer, range-checked. Every
  // rubric key must be present exactly once.
  const cList = (r.criteria as unknown[]).filter(
    (x): x is Record<string, unknown> => !!x && typeof x === 'object'
  )
  const criteria: SprechenCriterionScore[] = []
  let sum = 0
  for (const expected of SPRECHEN_B2_TEIL2.criteria) {
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

  // totalScore and passes are DERIVED from the criterion scores — the
  // per-criterion scores are the source of truth. Rejecting on the model's
  // own arithmetic (sum/pass-flag echoes) burned retries on local-claude,
  // which has no schema enforcement; the echoed fields are ignored instead.
  const totalScore = sum
  const passes = totalScore >= SPRECHEN_B2_TEIL2.passingScore

  // Mistakes — silently drop what cannot be verified against the transcript.
  const lTurns = learnerTurns(d)
  const mistakes: SprechenMistake[] = (r.mistakes as Array<Record<string, unknown>>).flatMap(m => {
    if (typeof m.turnIndex !== 'number' || !Number.isInteger(m.turnIndex)) return []
    if (m.turnIndex < 0 || m.turnIndex >= lTurns.length) return []
    if (typeof m.quote !== 'string' || m.quote.trim().length === 0) return []
    if (typeof m.suggested !== 'string') return []
    if (typeof m.kind !== 'string' || !ERROR_TAGS.includes(m.kind)) return []
    if (typeof m.reasonDe !== 'string' || typeof m.reasonEn !== 'string') return []
    const anchored = reAnchor(m.quote, lTurns[m.turnIndex].textDe)
    if (anchored.spanStart < 0) return []
    return [{
      turnIndex: m.turnIndex,
      quote: m.quote,
      suggested: m.suggested,
      kind: m.kind as SprechenErrorTag,
      reasonDe: m.reasonDe,
      reasonEn: m.reasonEn,
      spanStart: anchored.spanStart,
      spanEnd: anchored.spanEnd
    }]
  })

  const notes = (arr: unknown[]): BilingualNote[] =>
    (arr as Array<Record<string, unknown>>).flatMap(n =>
      typeof n?.de === 'string' && typeof n?.en === 'string' ? [{ de: n.de, en: n.en }] : []
    )

  // Descriptive extras: OPTIONAL by design. The local-claude bridge drops
  // responseSchema, so anything required here becomes a way for a good grade
  // to fail. Absent or malformed → undefined, and the result page omits the
  // matrix. Never a reason to return null.
  const turnCount = learnerTurns(d).length

  let structure: TurnStructure[] | undefined
  if (Array.isArray(r.structure)) {
    const cells = (r.structure as unknown[]).map(x => {
      const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
      return {
        these: o.these === true,
        begruendung: o.begruendung === true,
        beispiel: o.beispiel === true,
        reacts: o.reacts === true
      }
    })
    // Pad or truncate to the real turn count — never reject on length.
    structure = Array.from({ length: turnCount }, (_, i) =>
      cells[i] ?? { these: false, begruendung: false, beispiel: false, reacts: false }
    )
  }

  let interaction: InteractionSummary | undefined
  const ri = r.interaction
  if (ri && typeof ri === 'object') {
    const o = ri as Record<string, unknown>
    if (typeof o.askedBack === 'number' && typeof o.rate === 'number') {
      interaction = {
        askedBack: Math.max(0, Math.round(o.askedBack)),
        rate: Math.max(0, Math.min(1, o.rate))
      }
    }
  }

  return {
    totalScore,
    passes,
    praedikat: praedikat(totalScore),
    criteria,
    mistakes,
    strengths: notes(r.strengths),
    weaknesses: notes(r.weaknesses),
    overallDe: r.overallDe,
    overallEn: r.overallEn,
    generatedAt: Date.now(),
    modelUsed: 'unknown',
    structure,
    interaction
  }
}

// ── Fluency evidence (spoken modality only) ───────────────────────
//
// SPRECHDATEN block for the user message. Delivery evidence ONLY — it must
// sway `kohaerenz` alone, never the other three criteria (see the warning
// text below). Degrades gracefully (no throw, no NaN) when a learner turn,
// or the whole discussion, carries no `speech` data: summarizeFluency()
// already returns null for that case, and per-turn WPM guards divide-by-zero.
function formatSprechdaten(d: SprechenDiscussion): string {
  let li = 0
  const perTurnLines: string[] = []
  for (const t of d.turns) {
    if (t.role !== 'learner') continue
    const idx = li++
    if (!t.speech) {
      perTurnLines.push(`L${idx}: keine Sprechdaten erfasst.`)
      continue
    }
    const { spokenMs, reactionMs, restarts, words } = t.speech
    const minutes = spokenMs / 60_000
    const wpm = minutes > 0 ? Math.round(words / minutes) : 0
    const reactionS = (reactionMs / 1000).toFixed(1)
    perTurnLines.push(`L${idx}: ${wpm} Wörter/Min · Reaktionszeit ${reactionS} s · ${restarts} lange(n) Pause(n)`)
  }

  const summary = summarizeFluency(d.turns)
  const summaryLine = summary
    ? `Aggregiert über ${summary.turns} Redebeitrag/-träge: ${summary.wordsPerMinute} Wörter/Min · ` +
      `durchschnittliche Reaktionszeit ${(summary.avgReactionMs / 1000).toFixed(1)} s · ` +
      `${summary.pauses} lange(n) Pause(n) insgesamt.`
    : 'Aggregiert: keine Sprechdaten für diese Sitzung verfügbar.'

  return (
    'SPRECHDATEN (nur für die Bewertung von "kohaerenz" — siehe Warnung oben):\n' +
    perTurnLines.join('\n') + '\n' +
    summaryLine
  )
}

// ── Modality-aware prompt fragments ───────────────────────────────
//
// Same resolver pattern as `sprechenDescriptor`/`sprechenNotes` in
// rubrics.ts: a typed default plus a spoken override, chosen by modality.
// The typed branch is byte-identical to the pre-spoken-feature strings —
// see BASELINE_TYPED_SYSTEM in the test file — so it must never be touched;
// only the spoken branch may change.

/** Opening sentence of the grader's system persona. */
function graderPersonaDe(modality: Modality): string {
  return modality === 'spoken'
    ? 'Du bist eine strenge, kalibrierte Prüferin für die mündliche Goethe-B2-' +
      'Prüfung, die hier gesprochen und automatisch per Spracherkennung ' +
      'transkribiert wird.'
    : 'Du bist eine strenge, kalibrierte Prüferin für die mündliche Goethe-B2-' +
      'Prüfung, die hier in getippter Form geübt wird.'
}

// For spoken runs the transcript's spelling is the speech recognizer's
// choice, not the learner's — assigning "spelling" against it would archive
// a phantom mistake as the learner's own. The tag itself stays valid (old
// typed runs and history still use it); only the spoken PROMPT is told to
// never assign it.
function spellingCaveatDe(modality: Modality): string {
  return modality === 'spoken'
    ? '- WICHTIG: Diese Diskussion wurde GESPROCHEN und automatisch per ' +
      'Spracherkennung transkribiert. Die Schreibweise stammt von der ' +
      'Erkennungssoftware, NICHT vom Lernenden — vergib daher NIEMALS die ' +
      'Kategorie "spelling".\n'
    : ''
}

// ── Prompt builder ───────────────────────────────────────────────

export function buildSprechenGraderPrompt(
  d: SprechenDiscussion
): { system: string; user: string } {
  const rubricLines: string[] = []
  rubricLines.push(`RUBRIK: ${SPRECHEN_B2_TEIL2.labelDe}`)
  rubricLines.push(`Maximalpunktzahl: ${SPRECHEN_B2_TEIL2.totalMax} · Bestehensgrenze: ${SPRECHEN_B2_TEIL2.passingScore}`)
  rubricLines.push('')
  rubricLines.push('Kriterien (in dieser Reihenfolge, jedes mit max. Punktzahl):')
  for (const c of SPRECHEN_B2_TEIL2.criteria) {
    rubricLines.push(`- key="${c.key}" — ${c.labelDe} (max ${c.maxPoints} Punkte):`)
    rubricLines.push(`    ${sprechenDescriptor(c, d.modality)}`)
  }
  rubricLines.push('')
  rubricLines.push(`Hinweis: ${sprechenNotes(SPRECHEN_B2_TEIL2, d.modality)}`)

  const system =
    graderPersonaDe(d.modality) + ' Du bewertest AUSSCHLIESSLICH ' +
    'die Beiträge des Lernenden (mit L0, L1, … markiert) nach der Rubrik unten — ' +
    'die PARTNER-Beiträge stammen von einer KI und werden nicht bewertet.\n\n' +
    'Zusätzlich markierst du JEDEN sprachlichen Fehler in den Lernerbeiträgen:\n' +
    '- "turnIndex": die Zahl hinter dem L des betroffenen Beitrags.\n' +
    '- "quote": die fehlerhafte Stelle WÖRTLICH aus dem Beitrag zitiert ' +
    '(exakte Zeichenfolge, keine Umformulierung).\n' +
    '- "suggested": die korrigierte Fassung der Stelle.\n' +
    '- "kind": GENAU EINE Kategorie aus: grammar (Kasus, Konjugation, Endungen), ' +
    'word-order (Verbstellung, Satzklammer), vocabulary (falsches Wort, ' +
    'Kollokation), spelling (Rechtschreibung), register (Du/Sie, Stilebene).\n' +
    spellingCaveatDe(d.modality) +
    '- "reasonDe" UND "reasonEn": kurze Erklärung, WARUM es falsch ist ' +
    '(Deutsch einfach halten — B2-Lernende lesen sie).\n\n' +
    'Für jedes Kriterium: ganzzahlige Punktzahl im erlaubten Bereich plus kurze ' +
    'Begründung auf Deutsch UND Englisch. totalScore ist die exakte Summe der ' +
    'vier Kriterien; passes ist totalScore >= 60. Danach Stärken, Schwächen und ' +
    'ein Gesamturteil, jeweils Deutsch und Englisch.\n' +
    'Antworte ausschließlich als EIN JSON-Objekt exakt dieser Form — kein ' +
    'Prosa-Vorspann, keine Markdown-Fences:\n' +
    '{"totalScore": <ganze Zahl>, "passes": <true|false>, ' +
    '"criteria": [{"key": "<erfuellung|kohaerenz|wortschatz|strukturen>", ' +
    '"score": <ganze Zahl 0-25>, "justificationDe": "…", "justificationEn": "…"}, ' +
    '… genau 4, in genau dieser Reihenfolge], ' +
    '"mistakes": [{"turnIndex": <Zahl>, "quote": "…", "suggested": "…", ' +
    '"kind": "<grammar|word-order|vocabulary|spelling|register>", ' +
    '"reasonDe": "…", "reasonEn": "…"}], ' +
    '"strengths": [{"de": "…", "en": "…"}], "weaknesses": [{"de": "…", "en": "…"}], ' +
    '"overallDe": "…", "overallEn": "…"}\n\n' +
    'ZUSÄTZLICHE BESCHREIBENDE FELDER (beeinflussen die Punktzahl NICHT):\n' +
    '"structure": ein Array mit GENAU einem Objekt pro Lernerbeitrag, in derselben ' +
    'Reihenfolge wie die Beiträge. Jedes Objekt: {"these": <true|false>, ' +
    '"begruendung": <true|false>, "beispiel": <true|false>, "reacts": <true|false>}. ' +
    '"these" = der Beitrag vertritt eine Position; "begruendung" = er nennt einen Grund; ' +
    '"beispiel" = er nennt ein konkretes Beispiel; "reacts" = er geht auf den letzten ' +
    'Punkt des Partners ein.\n' +
    '"interaction": {"askedBack": <Anzahl echter Rückfragen an den Partner>, ' +
    '"rate": <Anteil der Beiträge mit reacts=true, als Dezimalzahl zwischen 0 und 1>}.\n' +
    'Diese beiden Felder sind BESCHREIBEND. Verteile dafür keine Punkte und ändere ' +
    'wegen ihnen keine Kriteriumsnote.\n\n' +
    rubricLines.join('\n')

  let li = 0
  const transcript = d.turns
    .map(t => t.role === 'learner' ? `L${li++}: ${t.textDe}` : `PARTNER: ${t.textDe}`)
    .join('\n')

  const fewTurns = learnerTurnCount(d) < 3
    ? '\n\nACHTUNG: Die Diskussion wurde früh beendet — es gibt wenig Material. ' +
      'Bewerte trotzdem nach der Rubrik, aber sei bei "erfuellung" entsprechend streng.'
    : ''

  // Spoken-only evidence block. Typed runs never touch this branch, so their
  // `user` string stays byte-identical to before this feature existed.
  const sprechdaten = d.modality === 'spoken'
    ? '\n\n' +
      'SPRECHDATEN-HINWEIS: Diese Diskussion wurde GESPROCHEN geführt (Spracherkennung, ' +
      'keine Audioaufnahme). Die folgenden Werte — Sprechtempo, Reaktionszeit, Anzahl ' +
      'langer Pausen — beschreiben AUSSCHLIESSLICH die Vortragsweise (Delivery) des ' +
      'Lernenden. Nutze sie NUR für die Bewertung von "kohaerenz". Sie dürfen die ' +
      'Bewertung von "erfuellung", "wortschatz" und "strukturen" NICHT beeinflussen.\n\n' +
      formatSprechdaten(d)
    : ''

  const user =
    `THEMA: „${d.topic.titleDe}" — ${d.topic.statementDe}\n` +
    `Position des PARTNERS: ${d.stance === 'pro' ? 'dafür' : 'dagegen'}.\n\n` +
    `GESPRÄCH:\n${transcript}${fewTurns}${sprechdaten}`

  return { system, user }
}

// ── Grader call with retries ─────────────────────────────────────

export async function gradeDiscussion(
  client: GeminiClient,
  model: string,
  d: SprechenDiscussion,
  maxRetries = 2
): Promise<SprechenGradeResult> {
  const { system, user } = buildSprechenGraderPrompt(d)
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
          responseSchema: SPRECHEN_GRADE_SCHEMA as unknown as Record<string, unknown>,
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
      const validated = validateSprechenGrade(parsed, d)
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
  throw new SprechenGraderError(`Grader exhausted ${attempts} attempts. Last error: ${lastError}`, attempts)
}

// ── Result stash (runner → result page, sessionStorage) ─────────

export const SPRECHEN_RESULT_KEY = 'gt:lastSprechenResult'

/** One-time payload for the result page. Dies with the tab — by design. */
export interface SprechenResultStash {
  topic: { id: string; titleDe: string; statementDe: string; source: 'seed' | 'custom' }
  stance: 'pro' | 'contra'
  // The Discussion's Modality (CONTEXT.md → "Modality"), fixed at creation.
  // The Auswertung needs it verbatim — not inferred from whether a turn
  // happens to carry `speech` data — to pick `kohaerenz`'s spoken descriptor
  // (§5.2: read the rubric's own variant, never paraphrase it).
  modality: Modality
  turnTarget: number
  turns: DiscussionTurn[]
  kiTippCount: number
  startedAt: number
  finishedAt: number
  result: SprechenGradeResult
}
