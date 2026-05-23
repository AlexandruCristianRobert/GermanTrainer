import { computed, ref } from 'vue'
import type { Verb, VerbTense } from '../data/verbs'
import { conjugate } from './conjugate'

// ───── Translation mode ─────────────────────────────────────────────

export interface TranslationQuestion {
  verb: Verb
  userAnswer: string | null
  isCorrect: boolean | null
}

function stripParens(s: string): string {
  // Drop any "(…)" hint segments from the canonical English so e.g.
  // "know (a fact)" compares equal to "know". Handles nested-free
  // input — sufficient for our verb data.
  return s.replace(/\([^)]*\)/g, '')
}

function normalizeTranslation(s: string): string {
  let n = stripParens(s).trim().replace(/\s+/g, ' ').toLowerCase()
  if (n.startsWith('to ')) n = n.slice(3).trim()
  return n
}

export function checkTranslation(input: string, english: string): boolean {
  const a = normalizeTranslation(input)
  if (a.length === 0) return false
  // Each slash-separated alternative is graded independently — typing
  // any one of them accepts. Parentheticals are stripped from both
  // sides so optional disambiguation hints don't reject correct words.
  return english.split('/').some(seg => normalizeTranslation(seg) === a)
}

export function useTranslationQuiz(verbs: Verb[]) {
  const questions = ref<TranslationQuestion[]>(
    verbs.map(v => ({ verb: v, userAnswer: null, isCorrect: null }))
  )
  const currentIndex = ref(0)

  function submit(answer: string): void {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    q.isCorrect = checkTranslation(answer, q.verb.english)
  }

  function advance(): void {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)

  return { questions, currentIndex, current, finished, score, total, submit, advance }
}

// ───── Conjugation mode ─────────────────────────────────────────────

const PRONOUN_TOKENS: Record<string, string[]> = {
  ich: ['ich'],
  du: ['du'],
  'er/sie/es': ['er', 'sie', 'es'],
  wir: ['wir'],
  ihr: ['ihr'],
  'sie/Sie': ['sie', 'Sie']
}

function normalizeConj(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function checkConjugation(input: string, expected: string, person?: string): boolean {
  let a = normalizeConj(input)
  if (person && PRONOUN_TOKENS[person]) {
    for (const tok of PRONOUN_TOKENS[person]) {
      const prefix = `${tok.toLowerCase()} `
      if (a.startsWith(prefix)) { a = a.slice(prefix.length); break }
    }
  }
  return a === normalizeConj(expected)
}

export interface ConjugationRowResult {
  person: string
  expected: string
  userAnswer: string
  isCorrect: boolean
}

export interface ConjugationQuestion {
  verb: Verb
  tense: VerbTense
  rows: ConjugationRowResult[]
  rowCorrect: boolean[]
  correctCount: number
  totalCount: number
  submitted: boolean
}

export function useConjugationQuiz(verbs: Verb[], tenses: VerbTense[]) {
  const pairs: Array<{ verb: Verb; tense: VerbTense }> = []
  for (const v of verbs) for (const t of tenses) pairs.push({ verb: v, tense: t })

  const questions = ref<ConjugationQuestion[]>(
    pairs.map(p => {
      const rows = conjugate(p.verb, p.tense)
      return {
        verb: p.verb,
        tense: p.tense,
        rows: rows.map(r => ({ person: r.person, expected: r.expected, userAnswer: '', isCorrect: false })),
        rowCorrect: rows.map(() => false),
        correctCount: 0,
        totalCount: rows.length,
        submitted: false
      }
    })
  )
  const currentIndex = ref(0)

  function submit(answers: string[]): void {
    const q = questions.value[currentIndex.value]
    if (!q) return
    let correct = 0
    q.rows.forEach((row, i) => {
      const userAnswer = answers[i] ?? ''
      const ok = checkConjugation(userAnswer, row.expected, row.person)
      row.userAnswer = userAnswer
      row.isCorrect = ok
      q.rowCorrect[i] = ok
      if (ok) correct++
    })
    q.correctCount = correct
    q.submitted = true
  }

  function advance(): void {
    currentIndex.value += 1
  }

  function skip(): void {
    const q = questions.value[currentIndex.value]
    if (!q) return
    submit(new Array(q.rows.length).fill(''))
    advance()
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const totalRows = computed(() => questions.value.reduce((s, q) => s + q.totalCount, 0))
  const correctRows = computed(() => questions.value.reduce((s, q) => s + q.correctCount, 0))
  const total = computed(() => questions.value.length)

  return { questions, currentIndex, current, finished, total, totalRows, correctRows, submit, advance, skip }
}
