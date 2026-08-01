// Quiz history storage — localStorage, capped at 100 entries (FIFO trim).
// Schema matches the design handoff (history.jsx).

import { bumpDrillTotals } from './useDrillMastery'

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
  | 'sprechen-teil2'

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

export interface QuizHistoryMeta {
  mode?: 'gender' | 'translation' | 'pick' | 'type'
  preps?: string[]   // Da-compound drills: preposition filter
  pairs?: string[]   // Direction Words compound drill: adverb-pair element filter
  kinds?: string[]   // Da-compound Korrelat drill (T11): status filter (obligatory/optional/excluded)
  groups?: string[]
  levels?: string[]
  types?: string[]
  cases?: string[]
  roles?: string[]   // Fixed prepositions drill: collocation word types (verb/adjective/noun)
  tenses?: string[]
  verbDirection?: 'de-en' | 'en-de'
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
