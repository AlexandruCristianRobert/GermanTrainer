import { computed, ref } from 'vue'
import type {
  DeclensionEntry, ArticleFillEntry, AdjectiveEndingEntry,
  DeclCase
} from '../data/declension'
import { DECL_CASES } from '../data/declension'
import type { PronounEntry } from '../data/pronouns'
import type { CaseRecognitionEntry } from '../data/case-recognition'

// ── Acceptance helpers ──────────────────────────────────────────

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function checkForm(input: string, expected: string, alternatives: string[]): boolean {
  const a = normalize(input)
  if (a.length === 0) return false
  if (normalize(expected) === a) return true
  return alternatives.some(alt => normalize(alt) === a)
}

export function checkArticle(input: string, expected: string, alternatives: string[]): boolean {
  return checkForm(input, expected, alternatives)
}

export function checkAdjective(input: string, expected: string, alternatives: string[]): boolean {
  return checkForm(input, expected, alternatives)
}

// ── Decline-the-phrase quiz state ───────────────────────────────

export interface TableRowResult {
  case: DeclCase
  expected: string
  userAnswer: string
  isCorrect: boolean
}

export interface TableQuestion {
  entry: DeclensionEntry
  rows: TableRowResult[]
  correctCount: number
  totalCount: number
  submitted: boolean
}

export function useTableQuiz(entries: DeclensionEntry[]) {
  const questions = ref<TableQuestion[]>(
    entries.map(e => ({
      entry: e,
      rows: DECL_CASES.map(c => ({
        case: c, expected: e.forms[c], userAnswer: '', isCorrect: false
      })),
      correctCount: 0,
      totalCount: DECL_CASES.length,
      submitted: false
    }))
  )
  const currentIndex = ref(0)

  function submit(answers: string[]) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    let correct = 0
    q.rows.forEach((row, i) => {
      const userAnswer = answers[i] ?? ''
      const ok = checkForm(userAnswer, row.expected, [])
      row.userAnswer = userAnswer
      row.isCorrect = ok
      if (ok) correct++
    })
    q.correctCount = correct
    q.submitted = true
  }

  function advance() { currentIndex.value += 1 }
  function skip() {
    submit(new Array(DECL_CASES.length).fill(''))
    advance()
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const totalRows = computed(() => questions.value.reduce((s, q) => s + q.totalCount, 0))
  const correctRows = computed(() => questions.value.reduce((s, q) => s + q.correctCount, 0))

  return { questions, currentIndex, current, finished, total, totalRows, correctRows, submit, advance, skip }
}

// ── Article-fill quiz state ─────────────────────────────────────

export interface ArticleQuestion {
  entry: ArticleFillEntry
  userAnswer: string
  isCorrect: boolean | null
}

export function useArticleQuiz(entries: ArticleFillEntry[]) {
  const questions = ref<ArticleQuestion[]>(
    entries.map(e => ({ entry: e, userAnswer: '', isCorrect: null }))
  )
  const currentIndex = ref(0)

  function submit(answer: string) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    q.isCorrect = checkArticle(answer, q.entry.expectedAnswer, q.entry.alternatives ?? [])
  }
  function advance() { currentIndex.value += 1 }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, submit, advance, score, total }
}

// ── Adjective-ending quiz state ─────────────────────────────────

export interface AdjectiveQuestion {
  entry: AdjectiveEndingEntry
  userAnswer: string
  isCorrect: boolean | null
}

export function useAdjQuiz(entries: AdjectiveEndingEntry[]) {
  const questions = ref<AdjectiveQuestion[]>(
    entries.map(e => ({ entry: e, userAnswer: '', isCorrect: null }))
  )
  const currentIndex = ref(0)

  function submit(answer: string) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    q.isCorrect = checkAdjective(answer, q.entry.expectedAnswer, q.entry.alternatives ?? [])
  }
  function advance() { currentIndex.value += 1 }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, submit, advance, score, total }
}

// ── Pronoun acceptance ──────────────────────────────────────────

export function checkPronoun(input: string, expected: string): boolean {
  // Reflexive dashes are not graded — caller skips those rows.
  if (expected === '—') return false
  return checkForm(input, expected, [])
}

// ── Case-recognition acceptance ─────────────────────────────────

export function checkCasePick(picked: DeclCase | null, expected: DeclCase): boolean {
  return picked === expected
}

// ── Pronoun quiz state ─────────────────────────────────────────

export interface PronounRowResult {
  case: DeclCase
  expected: string
  userAnswer: string
  isCorrect: boolean
  /** Reflexive nom/gen cells are not graded — UI shows '—' instead of input. */
  skipped: boolean
}

export interface PronounQuestion {
  entry: PronounEntry
  rows: PronounRowResult[]
  correctCount: number
  totalCount: number     // counts only non-skipped rows
  submitted: boolean
}

export function usePronounQuiz(entries: PronounEntry[]) {
  const questions = ref<PronounQuestion[]>(
    entries.map(e => {
      const rows: PronounRowResult[] = DECL_CASES.map(c => {
        const expected = e.forms[c]
        const skipped = expected === '—'
        return { case: c, expected, userAnswer: '', isCorrect: false, skipped }
      })
      return {
        entry: e,
        rows,
        correctCount: 0,
        totalCount: rows.filter(r => !r.skipped).length,
        submitted: false
      }
    })
  )
  const currentIndex = ref(0)

  function submit(answers: string[]) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    let correct = 0
    q.rows.forEach((row, i) => {
      if (row.skipped) return
      const userAnswer = answers[i] ?? ''
      const ok = checkPronoun(userAnswer, row.expected)
      row.userAnswer = userAnswer
      row.isCorrect = ok
      if (ok) correct++
    })
    q.correctCount = correct
    q.submitted = true
  }
  function advance() { currentIndex.value += 1 }
  function skip() {
    submit(new Array(DECL_CASES.length).fill(''))
    advance()
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const totalRows = computed(() => questions.value.reduce((s, q) => s + q.totalCount, 0))
  const correctRows = computed(() => questions.value.reduce((s, q) => s + q.correctCount, 0))

  return { questions, currentIndex, current, finished, total, totalRows, correctRows, submit, advance, skip }
}

// ── Case-recognition quiz state ─────────────────────────────────

export interface CaseRecognitionQuestion {
  entry: CaseRecognitionEntry
  picked: DeclCase | null
  isCorrect: boolean | null
}

export function useCaseRecognitionQuiz(entries: CaseRecognitionEntry[]) {
  const questions = ref<CaseRecognitionQuestion[]>(
    entries.map(e => ({ entry: e, picked: null, isCorrect: null }))
  )
  const currentIndex = ref(0)

  function pick(value: DeclCase) {
    const q = questions.value[currentIndex.value]
    if (!q || q.picked !== null) return     // one-shot per question
    q.picked = value
    q.isCorrect = checkCasePick(value, q.entry.case)
  }
  function advance() { currentIndex.value += 1 }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, pick, advance, score, total }
}
