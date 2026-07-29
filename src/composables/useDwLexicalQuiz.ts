// src/composables/useDwLexicalQuiz.ts
//
// Engine for the Direction Words T8 "lexicalized verb" drill: one sentence uses a
// hin-/her- prefix verb in EXACTLY ONE of its two readings — 'directional' (the
// prefix still points somewhere: sie ging in den Garten hinaus) vs 'lexicalized'
// (the prefix has fused into a fixed sense that points nowhere: die Firma stellt
// Möbel her = produziert). Like useDaHomographQuiz, this engine does NOT join a
// pool of collocations — DIRECTION_VERBS is authored standalone and filters
// directly by level (see src/data/directionVerbs.ts).
//
// Each question's two options come from the verb's DW_VERB_ENTRIES entry (its
// directional + lexicalized label), built ONCE per item and shuffled — never
// re-rolled on re-render, or the buttons would move under the learner's finger.
// Grading compares the picked reading against item.reading. The reveal (built in
// the runner from `options` + `item.explanation`) shows both labels with the
// correct one highlighted, whichever the learner picked.
//
// Because the level filter is a first-class chip, EVERY level that carries items
// must carry BOTH readings — otherwise a level-filtered session is winnable by
// pressing one button without reading any German. That invariant, and the
// surfaces-occur-once one that splitVerbSentence relies on, are locked in
// tests/composables/useDwLexicalQuiz.test.ts.

import { computed, ref } from 'vue'
import {
  DIRECTION_VERBS, verbEntryFor, type DwVerbItem, type DwVerbReading,
} from '../data/directionVerbs'
import { type DirectionLevel } from '../data/directionWords'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'

export type { DwVerbReading }

export type DwLexicalFilter = {
  levels?: DirectionLevel[]
}

const lexicalPool = createPool<DwVerbItem, DwLexicalFilter>(
  DIRECTION_VERBS,
  {
    levels: i => i.level,
  } satisfies FieldMatchers<DwVerbItem, DwLexicalFilter>
)

/** Items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterLexicalItems(f: DwLexicalFilter = {}): DwVerbItem[] {
  return lexicalPool.filter(f)
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleLexicalItems(count: number, f: DwLexicalFilter = {}): DwVerbItem[] {
  return lexicalPool.sample(count, f)
}

export interface DwLexicalOption {
  reading: DwVerbReading
  label: string
}

export interface DwLexicalQuestion {
  item: DwVerbItem
  /** The verb's two readings (directional + lexicalized label), shuffled order — built once. */
  options: DwLexicalOption[]
  /** The learner's picked reading, once answered. */
  picked: DwVerbReading | null
  isCorrect: boolean | null
}

/** Builds the two-option set for one item (order shuffled, never re-rolled). */
function buildOptions(item: DwVerbItem): DwLexicalOption[] {
  const entry = verbEntryFor(item)
  return shuffle([
    { reading: 'directional' as const, label: entry.directionalLabel },
    { reading: 'lexicalized' as const, label: entry.lexicalizedLabel },
  ])
}

export function useDwLexicalQuiz(items: DwVerbItem[]) {
  const questions = ref<DwLexicalQuestion[]>(items.map(item => ({
    item, options: buildOptions(item), picked: null, isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): DwVerbItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  /** Grades the tapped reading against the current item's correct reading. */
  function pick(reading: DwVerbReading): void {
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
 * Splits a sentence around its 1–2 verb surfaces so the runner can bold them in
 * place — the generalization of splitHomographSentence to a split prefix verb
 * ('stellt' … 'her'), which no regex over the infinitive could find.
 *
 * Walks left to right with a running cursor, locating each surface verbatim from
 * the cursor (the DIRECTION_VERBS invariant guarantees each occurs exactly once,
 * in sentence order). NEVER throws: a surface that cannot be located from the
 * cursor ends the walk and the remainder is emitted as plain text, so the runner
 * always renders the full sentence. Concatenating every part's text always
 * reproduces `item.sentence`, and no empty part is ever emitted.
 */
export function splitVerbSentence(item: DwVerbItem): Array<{ text: string; bold: boolean }> {
  const parts: Array<{ text: string; bold: boolean }> = []
  let cursor = 0
  for (const surface of item.surfaces) {
    const at = item.sentence.indexOf(surface, cursor)
    if (at === -1) break
    if (at > cursor) parts.push({ text: item.sentence.slice(cursor, at), bold: false })
    parts.push({ text: item.sentence.slice(at, at + surface.length), bold: true })
    cursor = at + surface.length
  }
  if (cursor < item.sentence.length) parts.push({ text: item.sentence.slice(cursor), bold: false })
  return parts
}
