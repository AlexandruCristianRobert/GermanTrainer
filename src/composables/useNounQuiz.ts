import { computed, ref } from 'vue'
import type { Noun } from '../db/types'

export type NounQuizMode = 'gender' | 'translation'

export interface NounQuestion {
  noun: Noun
  userAnswer: string | null
  isCorrect: boolean | null
}

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase()
}

function checkTranslation(input: string, expected: string): boolean {
  const i = normalizeAnswer(input)
  if (i.length === 0) return false
  return expected.split('/').some(seg => normalizeAnswer(seg) === i)
}

export function useNounQuiz(nouns: Noun[], mode: NounQuizMode) {
  const questions = ref<NounQuestion[]>(nouns.map(n => ({ noun: n, userAnswer: null, isCorrect: null })))
  const currentIndex = ref(0)

  function submit(answer: string): void {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    if (mode === 'gender') {
      q.isCorrect = answer === q.noun.gender
    } else {
      q.isCorrect = checkTranslation(answer, q.noun.english)
    }
  }

  function advance(): void {
    currentIndex.value += 1
  }

  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const current = computed(() => questions.value[currentIndex.value] ?? null)

  return { questions, currentIndex, current, finished, score, total, submit, advance }
}
