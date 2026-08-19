// Quiz history storage — localStorage, capped at 100 entries (FIFO trim).
// Schema matches the design handoff (history.jsx).

import { bumpDrillTotals } from './useDrillMastery'
import type { VerbTense } from '../data/verbs'

export type QuizHistoryType =
  | 'noun-gender'
  | 'noun-translation'
  | 'adjective'
  | 'verb-translation'
  | 'verb-conjugation'
  | 'verb-stammformen'
  | 'verb-case-government'
  | 'prep-case'
  | 'prep-article'
  | 'prep-two-way'
  | 'prep-collocations'
  | 'dac-formation'
  | 'dac-match'
  | 'dac-substitution'
  | 'dac-neighbors'
  | 'dac-case'
  | 'dac-pronoun-case'
  | 'dac-article'
  | 'dac-transform'
  | 'dac-wo-question'
  | 'dac-dialogue'
  | 'dac-korrelat'
  | 'dac-paraphrase'
  | 'dac-contrast'
  | 'dac-sentence'
  | 'dac-assembly'
  | 'dac-answer'
  | 'dac-homograph'
  | 'dac-register'
  | 'dac-relative'
  | 'dw-hinher'
  | 'dw-compound'
  | 'dw-question'
  | 'dw-register'
  | 'dw-assembly'
  | 'dw-sentence'
  | 'dw-answer'
  | 'dw-lexical'
  | 'dw-idiom'
  | 'prep-sentence'
  | 'prep-remedial'
  | 'verb-sentence'
  | 'verb-remedial'
  | 'decl-table'
  | 'decl-article'
  | 'decl-adjective'
  | 'decl-pronoun'
  | 'decl-case-recognition'
  | 'decl-article-ai'
  | 'konjunktiv-rewrite'
  | 'passiv-transform'
  | 'writing-grade'
  | 'simulator-c1'
  | 'sprechen-teil1'
  | 'schreiben-teil1'
  | 'schreiben-teil2'
  | 'sprechen-teil2'
  | 'sprechen-drill'
  | 'sentence-packed'
  | 'dat-case'
  | 'dat-form'
  | 'dat-trap'
  | 'dat-subject'
  | 'dat-experiencer'
  | 'dat-twin'
  | 'dat-ditrans'
  | 'dat-object-order'
  | 'dat-adjective'
  | 'dat-free'
  | 'dat-sentence'
  | 'dat-passive'
  | 'dat-reflexive'
  | 'relativ-pronomen'
  | 'ndekl-form'

export type PrepErrorTag = 'preposition' | 'case' | 'noun' | 'typo'

/** One recorded answer in a prep-sentence or prep-remedial run. */
export interface PrepDrillItem {
  prepId?: string        // present for sentence + case-fill items
  prepGerman?: string    // denormalized for display
  nounKeys?: string[]    // german surfaces of assigned theme nouns involved
  correct: boolean
  tags?: PrepErrorTag[]  // why wrong; absent under Exact grading / when correct
}

export type VerbErrorTag = 'conjugation' | 'case' | 'word-order' | 'noun' | 'typo'

/** One recorded answer in a verb-sentence or verb-remedial run. */
export interface VerbDrillItem {
  verbKeys?: string[]    // german infinitives of the drilled verbs
  nounKeys?: string[]    // german surfaces of the theme nouns
  correct: boolean
  tags?: VerbErrorTag[]  // why wrong; absent when correct
}

/**
 * A da-compound sentence error category the AI grader may assign.
 *  - preposition: the governed preposition is wrong or missing (warten *für → auf)
 *  - compound:    the preposition is right but the da-compound is malformed
 *                 (*daauf/*darmit → darauf/damit), OR a da-compound is used for a
 *                 PERSON (should be preposition + pronoun: "auf ihn"), OR a
 *                 preposition + pronoun is used for a THING (should be "darauf")
 *  - case:        right preposition, wrong governed case ending ("auf dem Bus" for Akk)
 *  - noun:        a wrong theme noun (word, gender, or form)
 *  - typo:        a small slip elsewhere
 *  - word-order:  verb-second (V2) violated, or a compound/da-compound misplaced
 *                 in the sentence (T17 answer-the-question grading only)
 */
export type DacErrorTag = 'preposition' | 'compound' | 'case' | 'noun' | 'typo' | 'word-order'

/**
 * A Sprechen error tag (see CONTEXT.md) — classification of one marked
 * mistake in a learner's Discussion turns. Unlike the drill tags, exactly
 * ONE kind per marked mistake (each annotation is a single span).
 */
export type SprechenErrorTag = 'grammar' | 'word-order' | 'vocabulary' | 'spelling' | 'register'

/** One recorded answer in a dac-sentence run (EN→DE only). */
export interface DacDrillItem {
  collocId?: string       // stable collocation id (for weak-point keying)
  collocWord?: string     // denormalized German headword for display
  prepGerman?: string     // the governed preposition, denormalized for display
  nounKeys?: string[]     // german surfaces of the theme nouns involved
  correct: boolean
  tags?: DacErrorTag[]    // why wrong; absent when correct
}

/**
 * A direction-word (hin-/her-) sentence error category the AI grader may
 * assign. 'direction' covers the drill's own mistake (wrong side, wrong
 * compound, misformed word) — the other five mirror the verb-sentence tags.
 */
export type DwErrorTag = 'direction' | 'conjugation' | 'case' | 'word-order' | 'noun' | 'typo'

/** One recorded answer in a dw-sentence or dw-answer run. */
export interface DwDrillItem {
  pair?: string          // adverb-pair element ('auf')
  compound?: string      // the target compound ('herauf'), denormalized for display
  nounKeys?: string[]    // german surfaces of the theme nouns involved
  correct: boolean
  tags?: DwErrorTag[]    // why wrong; absent when correct
}

/**
 * A Dativ-module error category the AI grader may assign (see CONTEXT.md,
 * [Dative error tag]). 'case', 'subject', 'twin' and 'object-order' are the
 * module's own; the other four mirror the verb-sentence tags.
 */
export type DatErrorTag = 'case' | 'subject' | 'twin' | 'object-order' | 'conjugation' | 'word-order' | 'noun' | 'typo'

/** One recorded answer in a dat-sentence run (T11, EN→DE only). */
export interface DatDrillItem {
  verb?: string          // the drilled dative verb (DATIVE_VERBS key)
  family?: string        // its semantic family, denormalized for display
  correct: boolean
  tags?: DatErrorTag[]   // why wrong; absent when correct
}

/** A connector error category the packed-sentence grader may assign. */
export type ConnErrorTag = 'connector' | 'word-order' | 'typo'

/** One recorded connector result in a sentence-packed run (EN→DE only). */
export interface ConnectorDrillItem {
  connId?: string      // stable connector id ('zwar-aber') for weak-point keying
  connWord?: string    // display form, denormalized ('zwar … aber')
  correct: boolean
  tags?: ConnErrorTag[]
}

export interface QuizHistoryMeta {
  mode?: 'gender' | 'translation' | 'pick' | 'type'
  preps?: string[]   // Da-compound drills: preposition filter
  pairs?: string[]   // Direction Words compound drill: adverb-pair element filter
  families?: string[] // Dativ drills: semantic-family filter (recipient/experiencer/co-agent)
  kinds?: string[]   // Da-compound Korrelat drill (T11): status filter (obligatory/optional/excluded)
  groups?: string[]
  levels?: string[]
  types?: string[]
  cases?: string[]
  roles?: string[]   // Fixed prepositions drill: collocation word types (verb/adjective/noun)
  verbs?: string[]        // Dativ drills: drilled dative-verb filter (T5)
  adjectives?: string[]   // Dativ adjective drill (T9): adjective lemma filter
  tenses?: string[]
  verbDirection?: 'de-en' | 'en-de'
  /** Verb translation EN→DE Variante; absent on DE→EN and on runs before it existed (= bedeutungsfeld). */
  variant?: 'bedeutungsfeld' | 'praezise'
  prepLevels?: string[]
  prepCases?: string[]

  // Preposition sentence-translation (AI)
  sentenceCases?: string[]
  sentenceGroups?: string[]
  nounsPerSentence?: 1 | 2 | 'mix'
  sentenceDirection?: 'en-de' | 'de-en'
  sentenceGrading?: 'ai' | 'exact'
  sentenceHints?: boolean
  sentenceItems?: PrepDrillItem[]

  // Verb sentence-translation (AI) — EN→DE, AI-graded
  verbSentenceLevels?: string[]
  verbSentenceTypes?: string[]
  verbSentenceCases?: string[]
  verbSentenceGroups?: string[]
  verbsPerSentence?: 1 | 2 | 'mix'
  verbSentenceNounsPer?: 1 | 2 | 'mix'
  verbSentenceHints?: boolean
  verbSentenceItems?: VerbDrillItem[]
  verbSentenceModality?: 'typed' | 'spoken'  // absent means typed (runs before this field existed)
  /** The Zeitform selection this run drew from (the per-spec assignment is not recorded). */
  verbSentenceTenses?: VerbTense[]

  // Da-compound sentence-translation (AI) — T14 EN→DE / T15 DE→EN, AI-graded
  dacSentenceLevels?: string[]
  dacSentenceRoles?: string[]
  dacSentencePreps?: string[]
  dacSentenceGroups?: string[]
  dacSentenceNounsPer?: 1 | 2 | 'mix'
  dacSentenceDirection?: 'en-de' | 'de-en'
  dacSentenceHints?: boolean
  dacSentenceItems?: DacDrillItem[]   // EN→DE only

  // Da-compound answer-the-question (AI) — T17, AI-graded (single direction)
  dacAnswerLevels?: string[]
  dacAnswerRoles?: string[]
  dacAnswerPreps?: string[]
  dacAnswerGroups?: string[]
  dacAnswerHints?: boolean
  dacAnswerItems?: DacDrillItem[]

  // Direction-words sentence-translation (AI) — T6, EN→DE, AI-graded
  dwSentenceLevels?: string[]
  dwSentencePairs?: string[]
  dwSentenceGroups?: string[]
  dwSentenceNounsPer?: 1 | 2 | 'mix'
  dwSentenceHints?: boolean
  dwSentenceItems?: DwDrillItem[]

  // Direction-words answer-the-question (AI) — T7, AI-graded (single direction)
  dwAnswerLevels?: string[]
  dwAnswerPairs?: string[]
  dwAnswerGroups?: string[]
  dwAnswerItems?: DwDrillItem[]

  // Dativ sentence-translation (AI) — T11, EN→DE, AI-graded
  datSentenceFamilies?: string[]
  datSentenceFocus?: 'all' | 'weak'
  datSentenceItems?: DatDrillItem[]

  declLevels?: string[]
  declCases?: string[]
  declDeterminers?: string[]
  declInflections?: string[]
  declPronounCategories?: string[]
  declCRLevels?: string[]
  declCRCases?: string[]
  declAIDifficulty?: 'easy' | 'medium' | 'hard'
  declAIBlanksCount?: number   // average blanks per sentence in the run

  // Konjunktiv I
  kiDifficulty?: 'easy' | 'medium' | 'hard'
  kiTopics?: string[]

  // Passiv
  passivDifficulty?: 'easy' | 'medium' | 'hard'
  passivFocusedTypes?: string[]
  passivPerTypeCorrect?: Record<string, { correct: number; total: number }>

  // Writing tutor
  promptId?: string
  taskType?: string
  rubric?: string
  bandEstimate?: string
  totalScore?: number
  wordCount?: number

  // Simulator C1
  sessionId?: string
  task1Score?: number
  task2Score?: number
  combinedScore?: number
  passes?: boolean
  maxScore?: number                                       // generic total-possible score (Sprechen Teil 1 sends it explicitly; Teil 2 implies 100)

  // Sprechen Teil 2 (Discussion) — summary only, no transcript (spec decision)
  topicTitle?: string
  turnTarget?: number
  learnerTurns?: number
  sprechenScore?: number                                  // 0–100
  sprechenPraedikat?: string
  sprechenCriteria?: Array<{ key: string; score: number; maxPoints: number }>
  sprechenMistakeCounts?: Partial<Record<SprechenErrorTag, number>>
  kiTippCount?: number
  sprechenStrengths?: Array<{ de: string; en: string }>
  sprechenWeaknesses?: Array<{ de: string; en: string }>
  sprechenOverallDe?: string
  sprechenOverallEn?: string
  // Redemittel matched in this Discussion's turns, banked into the lifetime
  // yield rollup at grade time (CONTEXT.md → "Redemittel yield"). The runner's
  // grade pipeline is the sole writer (added in Task 11 of the design-import
  // plan) — older Runs simply lack this field.
  sprechenRedemittel?: string[]
  // Spoken Discussions only (CONTEXT.md → "Modality"). One Run type covers both
  // modalities so typed and spoken scores stay comparable on the same scale;
  // these fields are simply absent for a typed run.
  sprechenModality?: 'typed' | 'spoken'
  sprechenWpm?: number
  sprechenAvgReactionMs?: number
  sprechenSpokenMs?: number
  sprechenPauses?: number

  // Sprechen Korrekturdrill (sprechen-drill) — replays the learner's own
  // archived corrections (CONTEXT.md → "Correction drill"). Optional and
  // summary-only: how many of the drilled items fell into each error kind.
  // The per-attempt CorrectionEvent record is the source of truth (ADR-0012);
  // this is just a convenience breakdown for the Run itself.
  sprechenDrilledKinds?: Partial<Record<SprechenErrorTag, number>>

  // Sprechen Teil 1 (Vortrag) — summary only, no Rede, no Nachfrage.
  // `schreiben-teil1` (Forumsbeitrag) and `schreiben-teil2` (Nachricht) runs
  // both reuse this same `sprechen*` meta cluster rather than forking their own
  // fields — the `type` discriminator already tells them apart, in ADR-0020's
  // misnomer-containment spirit.
  // `topicTitle` is deliberately reused rather than forked to `themaTitle`:
  // the hub's merged recents list reads meta.topicTitle for both parts, and
  // the Topic/Vortragsthema distinction is a domain one, not a storage one.
  sectionsCovered?: number                          // 0–5, the GRADER's coverage, never the rail's dots
  spokenSeconds?: number
  sprechenVortragsmittel?: string[]
  sprechenHelps?: { hints: boolean; checklist: boolean; kiTipp: boolean; hardLimit: boolean }
  sprechenAufwertungen?: Array<{ quote: string; better: string; whyDe: string; whyEn: string }>
  sprechenWallSeconds?: number   // F2 — wall-clock duration of the Rede, mic paused or not
  sprechenDowngraded?: boolean   // F13 — the run fell back from spoken to typed mid-Rede

  // Sentence module — packed cards (sentence-packed). Per-item records for
  // verbs/nouns reuse verbSentenceItems, preps reuse sentenceItems, and
  // da-compounds reuse dacSentenceItems (nounKeys: [] on all of them), so the
  // existing weak-point scorers pool packed evidence (ADR-0015). Connectors
  // are new and get their own item list.
  packedCounts?: { verb: number; noun: number; prep: number; dac: number; conn: number }
  packedDirection?: 'en-de' | 'de-en'
  packedModality?: 'typed' | 'spoken'
  packedHints?: boolean
  /** Fachgebiet ids the run was targeted at (ADR-0018) — descriptive only:
   *  weak points and mastery are keyed by item exactly as in an untargeted run. */
  packedDomains?: string[]
  packedItemsOk?: number      // items hit across the run (for the result header)
  packedItemsTotal?: number
  packedConnItems?: ConnectorDrillItem[]
}

export interface QuizHistoryEntry {
  id: number
  type: QuizHistoryType
  startedAt: string
  finishedAt: string
  durationMs: number
  count: number
  correct: number
  meta: QuizHistoryMeta
}

const STORAGE_KEY = 'gt:quizHistory'
const HISTORY_LIMIT = 100

function safeRead(): QuizHistoryEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function safeWrite(arr: QuizHistoryEntry[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  } catch {
    /* ignore quota / disabled */
  }
}

export function loadHistory(): QuizHistoryEntry[] {
  return safeRead()
}

export function saveQuizRun(entry: Omit<QuizHistoryEntry, 'id'>): void {
  const all = safeRead()
  const startedAtMs = Date.parse(entry.startedAt)
  const id = Number.isFinite(startedAtMs) ? startedAtMs : Date.now()
  const full: QuizHistoryEntry = { id, ...entry }
  // Bump the lifetime per-drill rollup with `all` as it stood *before* this
  // run — the one-time seed (if this is the very first bump) folds exactly
  // the prior runs, and this call adds `full` on top. gt:drillTotals is not
  // capped by HISTORY_LIMIT, so drill mastery survives this array's FIFO trim.
  bumpDrillTotals(full, all)
  all.unshift(full)
  const trimmed = all.slice(0, HISTORY_LIMIT)
  safeWrite(trimmed)
}

export function clearHistory(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function useQuizHistory() {
  return { loadHistory, saveQuizRun, clearHistory }
}
