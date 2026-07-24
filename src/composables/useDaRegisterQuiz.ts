// src/composables/useDaRegisterQuiz.ts
//
// Engine for the T19 "register" drill: judge one authored phrase — is it
// Standard German (fine in speech AND writing), colloquial/spoken-only, or
// ungrammatical in every register? Like Homograph/Korrelat, this engine does
// NOT join a pool of collocations — DA_REGISTER is authored standalone and
// filters directly by level (see src/data/daRegister.ts).
//
// Every question's THREE options are FIXED and in a stable authoring order —
// never shuffled, never re-rolled, always the same three verdicts/labels
// (REGISTER_OPTIONS). Grading compares the picked verdict against
// item.verdict. The reveal always shows the explanation; for 'wrong' items
// the runner additionally strikes through the authored phrase and shows the
// corrected form named in the explanation (see correctedForm below).

import { computed, ref } from 'vue'
import { DA_REGISTER, type RegisterItem, type RegisterVerdict } from '../data/daRegister'
import { type CollocationLevel } from '../data/collocations'
import { createPool, type FieldMatchers } from '../data/pool'

export type { RegisterVerdict }

export type RegisterFilter = {
  levels?: CollocationLevel[]
}

const registerPool = createPool<RegisterItem, RegisterFilter>(
  DA_REGISTER,
  {
    levels: i => i.level,
  } satisfies FieldMatchers<RegisterItem, RegisterFilter>
)

/** Items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterRegisterItems(f: RegisterFilter = {}): RegisterItem[] {
  return registerPool.filter(f)
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleRegisterItems(count: number, f: RegisterFilter = {}): RegisterItem[] {
  return registerPool.sample(count, f)
}

export interface RegisterOption {
  verdict: RegisterVerdict
  label: string
}

/** The three fixed judgment options, in stable order — identical on every question. */
export const REGISTER_OPTIONS: RegisterOption[] = [
  { verdict: 'standard', label: 'Standard – auch geschrieben' },
  { verdict: 'spoken', label: 'Nur gesprochen' },
  { verdict: 'wrong', label: 'Immer falsch' },
]

export interface RegisterQuestion {
  item: RegisterItem
  /** Always REGISTER_OPTIONS, in that fixed order — never shuffled, never re-rolled. */
  options: RegisterOption[]
  /** The learner's picked verdict, once answered. */
  picked: RegisterVerdict | null
  isCorrect: boolean | null
}

export function useDaRegisterQuiz(items: RegisterItem[]) {
  const questions = ref<RegisterQuestion[]>(items.map(item => ({
    item, options: REGISTER_OPTIONS, picked: null, isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): RegisterItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  /** Grades the tapped verdict against the current item's correct verdict. */
  function pick(verdict: RegisterVerdict): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = verdict
    q.isCorrect = verdict === q.item.verdict
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    pick, advance,
  }
}

/**
 * For a 'wrong' item, extracts the corrected form named in its explanation —
 * the LAST quoted string in the English half (after " / "), which every
 * DA_REGISTER 'wrong' item's explanation names as the one correct form
 * (see src/data/daRegister.ts authoring convention). Returns null for
 * standard/spoken items, or if the explanation carries no quoted form.
 */
export function correctedForm(item: RegisterItem): string | null {
  if (item.verdict !== 'wrong') return null
  const englishHalf = item.explanation.split(' / ')[1] ?? item.explanation
  const matches = [...englishHalf.matchAll(/"([^"]+)"/g)]
  if (matches.length === 0) return null
  return matches[matches.length - 1][1]
}
