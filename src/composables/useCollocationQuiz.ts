import { computed, ref } from 'vue'
import type { Collocation, CollocationCase } from '../data/collocations'
import { checkText } from './drillGrading'

export interface CollocationQuestion {
  item: Collocation
  prepositionOk: boolean | null
  caseOk: boolean | null
  isCorrect: boolean | null
}

export interface CollocationAnswer {
  preposition: string
  case: CollocationCase
}

export function useCollocationQuiz(items: Collocation[]) {
  const questions = ref<CollocationQuestion[]>(
    items.map(item => ({
      item,
      prepositionOk: null,
      caseOk: null,
      isCorrect: null,
    }))
  )

  const currentIndex = ref(0)

  function submit(answer: CollocationAnswer): void {
    const q = questions.value[currentIndex.value]
    if (!q) return

    const prepositionOk = checkText(answer.preposition, q.item.preposition, q.item.alternatives)
    const caseOk = answer.case === q.item.case

    q.prepositionOk = prepositionOk
    q.caseOk = caseOk
    q.isCorrect = prepositionOk && caseOk
  }

  function advance(): void {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const wrongItems = computed(() =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  return { questions, currentIndex, current, finished, score, total, wrongItems, submit, advance }
}
