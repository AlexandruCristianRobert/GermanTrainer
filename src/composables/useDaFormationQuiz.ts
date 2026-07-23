import { computed, ref } from 'vue'
import {
  DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS, daCompound, woCompound, isVowelInitial,
} from '../data/daCompounds'

export type FormationChoice = 'da' | 'dar' | 'none'

export interface FormationItem {
  preposition: string
  expected: FormationChoice
  da: string | null   // darauf | null for traps
  wo: string | null
}

export interface FormationQuestion extends FormationItem {
  picked: FormationChoice | null
  isCorrect: boolean | null
}

export function buildFormationItems(includeTraps: boolean): FormationItem[] {
  const table: FormationItem[] = DA_COMPOUND_PREPOSITIONS.map(e => ({
    preposition: e.preposition,
    expected: isVowelInitial(e.preposition) ? 'dar' : 'da',
    da: daCompound(e.preposition),
    wo: woCompound(e.preposition),
  }))
  if (!includeTraps) return table
  const traps: FormationItem[] = NO_COMPOUND_PREPOSITIONS.map(p => ({
    preposition: p, expected: 'none', da: null, wo: null,
  }))
  return [...table, ...traps]
}

export function useDaFormationQuiz(items: FormationItem[]) {
  const questions = ref<FormationQuestion[]>(items.map(i => ({ ...i, picked: null, isCorrect: null })))
  const currentIndex = ref(0)
  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const wrongItems = computed(() =>
    questions.value.filter(q => q.isCorrect === false).map(({ picked, isCorrect, ...item }) => item as FormationItem))

  function pick(choice: FormationChoice) {
    const q = questions.value[currentIndex.value]
    if (!q || q.picked !== null) return
    q.picked = choice
    q.isCorrect = choice === q.expected
  }
  function advance() {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }
  return { questions, currentIndex, current, finished, pick, advance, score, total, wrongItems }
}
