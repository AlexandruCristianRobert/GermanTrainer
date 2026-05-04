import { computed, ref } from 'vue'
import type { SentenceItem } from './useClaude'

export interface AdjectiveQuestion {
  item: SentenceItem
  blanked: string
  userAnswer: string | null
  isCorrect: boolean | null
}

export function blankSentence(sentence: string, inflected: string): string {
  const placeholder = '_'.repeat(Math.max(inflected.length, 4))
  const idx = sentence.toLowerCase().indexOf(inflected.toLowerCase())
  if (idx < 0) return sentence
  return sentence.slice(0, idx) + placeholder + sentence.slice(idx + inflected.length)
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

export function useAdjectiveQuiz(items: SentenceItem[]) {
  const questions = ref<AdjectiveQuestion[]>(
    items.map(i => ({
      item: i,
      blanked: blankSentence(i.sentence, i.adjective_inflected),
      userAnswer: null,
      isCorrect: null
    }))
  )
  const currentIndex = ref(0)

  function submit(answer: string): void {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.userAnswer = answer
    const a = normalize(answer)
    if (a.length === 0) {
      q.isCorrect = false
      return
    }
    q.isCorrect =
      a === normalize(q.item.adjective_inflected) || a === normalize(q.item.adjective_base)
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
