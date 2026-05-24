import { computed, ref } from 'vue'
import type {
  DeclensionEntry, ArticleFillEntry, AdjectiveEndingEntry,
  DeclCase
} from '../data/declension'
import { DECL_CASES } from '../data/declension'

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
