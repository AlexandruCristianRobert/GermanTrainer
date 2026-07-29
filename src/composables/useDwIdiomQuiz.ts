// src/composables/useDwIdiomQuiz.ts
//
// Engine for the Direction Words T9 "idiom gap-fill" drill: one sentence with a
// single ___ gap standing for a WHOLE idiom surface ('hin und her', 'noch lange
// hin', 'hinter ihr her'), and 3–4 tappable options drawn from the closed
// DW_IDIOM_SURFACES inventory. Like useDwLexicalQuiz, this engine does NOT join a
// pool of collocations — DIRECTION_IDIOMS is authored standalone and filters
// directly by level (see src/data/directionIdioms.ts).
//
// DIRECTION_IDIOMS authors the answer FIRST in every option list, so shuffling is
// not cosmetic here: without it, index 0 would be correct on all 28 items and the
// drill would be winnable without reading any German. Each question's options are
// therefore a SHUFFLED COPY of item.options, built ONCE at construction and never
// re-rolled on re-render (a re-rolling computed would move the buttons under the
// learner's finger). `shuffle` copies its source, so the module-level bank is
// never sorted or reversed in place — nothing here may change that.
//
// Grading compares the picked surface against item.answer; a second pick on an
// answered question is a no-op. The reveal (built in the runner from
// `item.explanation`) names the meaning AND why the tempting near-miss fails.
//
// The reveal's filled sentence is built here too — splitIdiomGap/fillIdiomGap —
// because dropping a surface into a gap is an ORTHOGRAPHIC operation, not a
// string replace: sentence-initial and post-colon gaps capitalise it. Keeping the
// rule in the engine keeps it unit-testable and lets a bank-wide invariant sweep
// every item (tests/data/directionIdioms.test.ts).

import { computed, ref } from 'vue'
import { DIRECTION_IDIOMS, type DwIdiomItem } from '../data/directionIdioms'
import { type DirectionLevel } from '../data/directionWords'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'

export type DwIdiomFilter = {
  levels?: DirectionLevel[]
}

const idiomPool = createPool<DwIdiomItem, DwIdiomFilter>(
  DIRECTION_IDIOMS,
  {
    levels: i => i.level,
  } satisfies FieldMatchers<DwIdiomItem, DwIdiomFilter>
)

/** Items matching the filter (an empty/omitted field matches every value, per createPool). */
export function filterIdiomItems(f: DwIdiomFilter = {}): DwIdiomItem[] {
  return idiomPool.filter(f)
}

/** A fresh random sample of up to `count` items matching the filter. */
export function sampleIdiomItems(count: number, f: DwIdiomFilter = {}): DwIdiomItem[] {
  return idiomPool.sample(count, f)
}

/**
 * Does a surface dropped into this gap start a sentence? True when the gap opens
 * the sentence (id-5 puts it in the Vorfeld) and when the text before it ends in
 * a colon or in terminal punctuation — Duden capitalises a full utterance after a
 * colon, which is what "…nur eines: Her mit dem Geld!" (id-26) needs. A bare
 * Gedankenstrich is NOT a trigger: it starts no new sentence, so "Nicht lange
 * diskutieren — her mit dem Schlüssel" (id-27) stays lowercase; a dash that
 * follows terminal punctuation does count.
 *
 * The bank-wide guard on this rule lives in tests/data/directionIdioms.test.ts:
 * it re-derives "sentence-initial or post-colon" independently (and quote-aware)
 * for every item, so an added item whose gap sits in a position this helper does
 * not handle — after an opening „ , after an ordinal's period — fails there
 * instead of silently rendering wrong German in the reveal.
 */
function startsSentence(before: string): boolean {
  const trimmed = before.trimEnd()
  if (trimmed === '') return true
  return /[:.!?…](\s*[—–-]+)?$/.test(trimmed)
}

/**
 * The sentence in three pieces around its single ___ gap, with the surface
 * capitalised where German capitalises (see startsSentence). Splitting rather
 * than only joining lets the UI mark the inserted surface up in place — the
 * splitVerbSentence pattern in useDwLexicalQuiz.
 */
export function splitIdiomGap(sentence: string, surface: string): { before: string; filled: string; after: string } {
  const idx = sentence.indexOf('___')
  if (idx < 0) return { before: sentence, filled: '', after: '' }
  const before = sentence.slice(0, idx)
  const filled = startsSentence(before)
    ? surface.charAt(0).toUpperCase() + surface.slice(1)
    : surface
  return { before, filled, after: sentence.slice(idx + '___'.length) }
}

/** The gap-filled sentence — splitIdiomGap, joined. */
export function fillIdiomGap(sentence: string, surface: string): string {
  const { before, filled, after } = splitIdiomGap(sentence, surface)
  return before + filled + after
}

export interface DwIdiomQuestion {
  item: DwIdiomItem
  /** The item's own options in shuffled order — a COPY, built once, never re-rolled. */
  options: string[]
  /** The learner's picked surface, once answered. */
  picked: string | null
  isCorrect: boolean | null
}

/**
 * Builds the option row for one item: a shuffled COPY of item.options (shuffle
 * never mutates its source, so DIRECTION_IDIOMS stays as authored). The shuffle
 * is what stops the authored answer-first order from leaking into the UI.
 */
function buildOptions(item: DwIdiomItem): string[] {
  return shuffle(item.options)
}

export function useDwIdiomQuiz(items: DwIdiomItem[]) {
  const questions = ref<DwIdiomQuestion[]>(items.map(item => ({
    item, options: buildOptions(item), picked: null, isCorrect: null,
  })))
  const currentIndex = ref(0)

  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const total = computed(() => questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const wrongItems = computed((): DwIdiomItem[] =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.item)
  )

  /** Grades the tapped surface against the current item's authored answer. */
  function pick(surface: string): void {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = surface
    q.isCorrect = surface === q.item.answer
  }

  function advance(): void {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return {
    questions, currentIndex, current, finished, total, score, wrongItems,
    pick, advance,
  }
}
