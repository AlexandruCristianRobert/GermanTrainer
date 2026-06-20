import { computed, ref } from 'vue'
import type { Verb } from '../data/verbs'
import { conjugate } from './conjugate'
import { checkText } from './drillGrading'

export interface StammformenExpected {
  praeteritum: string
  partizip2: string
  aux: 'haben' | 'sein'
}

export interface StammformenQuestion {
  verb: Verb
  expected: StammformenExpected
  praeteritumOk: boolean | null
  partizipOk: boolean | null
  auxOk: boolean | null
  isCorrect: boolean | null
}

export interface StammformenAnswer {
  praeteritum: string
  partizip: string
  aux: 'haben' | 'sein'
}

export function useStammformenQuiz(verbs: Verb[]) {
  const questions = ref<StammformenQuestion[]>(
    verbs.map(verb => ({
      verb,
      expected: {
        praeteritum: conjugate(verb, 'praeteritum')[2].expected,
        partizip2: verb.partizip2,
        aux: verb.auxiliary,
      },
      praeteritumOk: null,
      partizipOk: null,
      auxOk: null,
      isCorrect: null,
    }))
  )

  const currentIndex = ref(0)

  function submit(answer: StammformenAnswer): void {
    const q = questions.value[currentIndex.value]
    if (!q) return

    const praeteritumOk = checkText(answer.praeteritum, q.expected.praeteritum)
    const partizipOk = checkText(answer.partizip, q.expected.partizip2)
    const auxOk = answer.aux === q.expected.aux

    q.praeteritumOk = praeteritumOk
    q.partizipOk = partizipOk
    q.auxOk = auxOk
    q.isCorrect = praeteritumOk && partizipOk && auxOk
  }

  function advance(): void {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const wrongVerbs = computed(() =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.verb)
  )

  return { questions, currentIndex, current, finished, score, total, wrongVerbs, submit, advance }
}
