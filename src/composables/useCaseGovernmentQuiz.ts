import { computed, ref } from 'vue'
import type { Verb, VerbCase } from '../data/verbs'

export interface CaseGovernmentQuestion {
  verb: Verb
  picked: VerbCase | null
  isCorrect: boolean | null
}

export function useCaseGovernmentQuiz(verbs: Verb[]) {
  // Defensively filter out any verb whose case is 'varies'
  const filtered = verbs.filter(v => v.case !== 'varies')

  const questions = ref<CaseGovernmentQuestion[]>(
    filtered.map(v => ({ verb: v, picked: null, isCorrect: null }))
  )
  const currentIndex = ref(0)

  function pick(value: VerbCase) {
    const q = questions.value[currentIndex.value]
    if (!q) return
    q.picked = value
    q.isCorrect = value === q.verb.case
  }

  function advance() {
    currentIndex.value += 1
  }

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)

  const wrongVerbs = computed<Verb[]>(() =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.verb)
  )

  return { questions, currentIndex, current, finished, pick, advance, score, total, wrongVerbs }
}
