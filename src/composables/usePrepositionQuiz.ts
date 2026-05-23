import { computed, ref } from 'vue'
import type { Preposition, PrepositionExample, PrepCase } from '../data/prepositions'

// ── Article-fill acceptance ───────────────────────────────────

function normalizeArticle(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function checkArticle(input: string, expected: string, alternatives: string[]): boolean {
  const a = normalizeArticle(input)
  if (a.length === 0) return false
  if (normalizeArticle(expected) === a) return true
  return alternatives.some(alt => normalizeArticle(alt) === a)
}

// ── Which-case acceptance ─────────────────────────────────────

export function checkCase(picked: PrepCase | null, expected: PrepCase): boolean {
  return picked === expected
}

// ── Two-way decision acceptance ───────────────────────────────

export type TwoWayPick = 'accusative' | 'dative'

export function checkTwoWay(picked: TwoWayPick | null, usedCase: 'accusative' | 'dative' | 'genitive'): boolean {
  if (picked === null) return false
  // Two-way preps only ever use acc or dat in our dataset; guard anyway.
  if (usedCase === 'genitive') return false
  return picked === usedCase
}

// ── Quiz state holders (mirrors useVerbQuiz patterns) ─────────

export interface CaseQuestion {
  prep: Preposition
  picked: PrepCase | null
  isCorrect: boolean | null
}

export function useCaseQuiz(preps: Preposition[]) {
  const questions = ref<CaseQuestion[]>(preps.map(p => ({ prep: p, picked: null, isCorrect: null })))

  function pick(i: number, value: PrepCase) {
    const q = questions.value[i]
    if (!q) return
    q.picked = value
  }

  function grade() {
    for (const q of questions.value) {
      q.isCorrect = checkCase(q.picked, q.prep.case)
    }
  }

  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, pick, grade, score, total }
}

export interface ArticleQuestion {
  prep: Preposition
  example: PrepositionExample
  userAnswer: string
  isCorrect: boolean | null
}

export function useArticleQuiz(pairs: Array<{ prep: Preposition; example: PrepositionExample }>) {
  const questions = ref<ArticleQuestion[]>(
    pairs.map(p => ({ prep: p.prep, example: p.example, userAnswer: '', isCorrect: null }))
  )
  const currentIndex = ref(0)

  function submit(answer: string) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    q.isCorrect = checkArticle(answer, q.example.expectedAnswer, q.example.alternatives ?? [])
  }

  function advance() {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, submit, advance, score, total }
}

export interface TwoWayQuestion {
  prep: Preposition
  example: PrepositionExample
  picked: TwoWayPick | null
  isCorrect: boolean | null
}

export function useTwoWayQuiz(pairs: Array<{ prep: Preposition; example: PrepositionExample }>) {
  const questions = ref<TwoWayQuestion[]>(
    pairs.map(p => ({ prep: p.prep, example: p.example, picked: null, isCorrect: null }))
  )
  const currentIndex = ref(0)

  function pick(value: TwoWayPick) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.picked = value
    q.isCorrect = checkTwoWay(value, q.example.usedCase)
  }

  function advance() {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  return { questions, currentIndex, current, finished, pick, advance, score, total }
}
