// Quiz history storage — localStorage, capped at 100 entries (FIFO trim).
// Schema matches the design handoff (history.jsx).

export type QuizHistoryType =
  | 'noun-gender'
  | 'noun-translation'
  | 'adjective'
  | 'verb-translation'
  | 'verb-conjugation'
  | 'prep-case'
  | 'prep-article'
  | 'prep-two-way'
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

export interface QuizHistoryMeta {
  mode?: 'gender' | 'translation'
  groups?: string[]
  levels?: string[]
  types?: string[]
  cases?: string[]
  tenses?: string[]
  prepLevels?: string[]
  prepCases?: string[]
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
