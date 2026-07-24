// Quiz history storage — localStorage, capped at 100 entries (FIFO trim).
// Schema matches the design handoff (history.jsx).

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

/** One recorded answer in a dac-sentence run (EN→DE only). */
export interface DacDrillItem {
  collocId?: string       // stable collocation id (for weak-point keying)
  collocWord?: string     // denormalized German headword for display
  prepGerman?: string     // the governed preposition, denormalized for display
  nounKeys?: string[]     // german surfaces of the theme nouns involved
  correct: boolean
  tags?: DacErrorTag[]    // why wrong; absent when correct
}

export interface QuizHistoryMeta {
  mode?: 'gender' | 'translation' | 'pick' | 'type'
  preps?: string[]   // Da-compound drills: preposition filter
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
  all.unshift({ id, ...entry })
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
