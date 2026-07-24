// src/composables/useDaHomographQuiz.ts
//
// Engine for the T18 "homograph" drill: sentences using an ambiguous word —
// damit / darum / dabei / dagegen / danach / davor — in EXACTLY ONE of its two
// readings (pronominal-adverb "compound" vs. free conjunction/adverb "connector").
// Like Contrast/Korrelat, this engine does NOT join a pool of collocations —
// DA_HOMOGRAPH is authored standalone and filters directly by level (see
// src/data/daHomograph.ts).
//
// Each question's two options come from the word's HOMOGRAPH_WORDS entry (its
// compound + connector label), built once per item and shuffled — never re-rolled.
// Grading compares the picked reading against item.reading. The reveal (built in
// the runner from `options` + `item.explanation`) shows both labels, with the
// correct one highlighted, regardless of which the learner picked.

import { computed, ref } from 'vue'
import {
  DA_HOMOGRAPH, HOMOGRAPH_WORDS, type HomographItem, type HomographReading,
} from '../data/daHomograph'
import { type CollocationLevel } from '../data/collocations'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'

export type { HomographReading }

const wordByKey = new Map(HOMOGRAPH_WORDS.map(w => [w.word, w]))

function wordFor(item: HomographItem) {
  const w = wordByKey.get(item.word)
  if (!w) throw new Error(`Unknown homograph word: ${item.word}`)
  return w
}

export type HomographFilter = {
  levels?: CollocationLevel[]
}

const homographPool = createPool<HomographItem, HomographFilter>(
  DA_HOMOGRAPH,
  {
    levels: i => i.level,
  } satisfies FieldMatchers<HomographItem, HomographFilter>
)

/** Items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterHomographItems(f: HomographFilter = {}): HomographItem[] {
  return homographPool.filter(f)
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleHomographItems(count: number, f: HomographFilter = {}): HomographItem[] {
  return homographPool.sample(count, f)
}

export interface HomographOption {
  reading: HomographReading
  label: string
}

export interface HomographQuestion {
  item: HomographItem
  /** The word's two readings (compound + connector label), shuffled order — built once. */
  options: HomographOption[]
  /** The learner's picked reading, once answered. */
  picked: HomographReading | null
  isCorrect: boolean | null
}

/** Builds the two-option set for one item (order shuffled, never re-rolled). */
function buildOptions(item: HomographItem): HomographOption[] {
  const w = wordFor(item)
  return shuffle([
    { reading: 'compound' as const, label: w.compoundLabel },
    { reading: 'connector' as const, label: w.connectorLabel },
  ])
}

export function useDaHomographQuiz(items: HomographItem[]) {
  const questions = ref<HomographQuestion[]>(items.map(item => ({
    item, options: buildOptions(item), picked: null, isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): HomographItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  /** Grades the tapped reading against the current item's correct reading. */
  function pick(reading: HomographReading): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = reading
    q.isCorrect = reading === q.item.reading
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
 * Splits a sentence around its ambiguous word — an exact, case-insensitive,
 * whole-token match (the word appears verbatim per the DA_HOMOGRAPH invariant) —
 * so the runner can render it bolded in its own on-sentence casing.
 */
export function splitHomographSentence(
  sentence: string, word: string
): { pre: string; match: string; post: string } {
  const re = new RegExp(`\\b${word}\\b`, 'i')
  const m = re.exec(sentence)
  if (!m) return { pre: sentence, match: '', post: '' }
  const start = m.index
  const end = start + m[0].length
  return { pre: sentence.slice(0, start), match: sentence.slice(start, end), post: sentence.slice(end) }
}
